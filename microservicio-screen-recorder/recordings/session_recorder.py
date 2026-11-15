import asyncio
import logging

from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.sdp import candidate_from_sdp

from recordings.audio_segmenter import segment_audio_track
from recordings.ice_servers import load_rtc_configuration
from recordings.session_signaling import SessionSignaling
from recordings.video_sampler import sample_video_track

logger = logging.getLogger(__name__)


class SessionRecorder:
    def __init__(self, config, session_id, loop, on_ended):
        self.config = config
        self.session_id = session_id
        self.on_session_ended = on_ended
        self.peer: RTCPeerConnection | None = None
        self.peer_lock = asyncio.Lock()
        self.media_tasks: set[asyncio.Task] = set()
        self.video_count = 0
        self.pending_ice: list[dict] = []
        self.signaling = SessionSignaling(config, session_id, loop, self)
        self.signaling_task: asyncio.Task | None = None

    async def start(self):
        self.signaling_task = asyncio.create_task(asyncio.to_thread(self.signaling.run))

    async def stop(self):
        self.signaling.stop()
        await self._close_peer()
        if self.signaling_task:
            try:
                await asyncio.wait_for(self.signaling_task, timeout=5)
            except TimeoutError:
                self.signaling_task.cancel()

    async def on_offer(self, payload):
        sdp = payload.get('sdp') or {}
        publisher_socket_id = payload.get('from')
        if (
            sdp.get('type') != 'offer'
            or not isinstance(sdp.get('sdp'), str)
            or not isinstance(publisher_socket_id, str)
        ):
            return
        async with self.peer_lock:
            peer = await self._ensure_peer()
            await peer.setRemoteDescription(RTCSessionDescription(sdp=sdp['sdp'], type='offer'))
            for candidate in self.pending_ice:
                await self._add_ice(peer, candidate)
            self.pending_ice.clear()
            answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            local = peer.localDescription
            await self.signaling.emit('webrtc-answer', {
                'publisherSocketId': publisher_socket_id,
                'sdp': {'sdp': local.sdp, 'type': local.type},
            })

    async def on_ice(self, payload):
        peer = self.peer
        raw = payload.get('candidate') or {}
        if not raw.get('candidate'):
            return
        if not peer or not peer.remoteDescription:
            if len(self.pending_ice) < 64:
                self.pending_ice.append(raw)
            return
        await self._add_ice(peer, raw)

    async def _add_ice(self, peer, raw):
        try:
            value = str(raw['candidate']).removeprefix('candidate:')
            candidate = candidate_from_sdp(value)
            candidate.sdpMid = raw.get('sdpMid')
            candidate.sdpMLineIndex = raw.get('sdpMLineIndex')
            await peer.addIceCandidate(candidate)
        except (KeyError, ValueError) as error:
            logger.warning('ICE inválido descartado para %s: %s', self.session_id, error)

    async def on_ended(self):
        await self.on_session_ended(self.session_id)

    async def on_disconnected(self):
        await self._close_peer()

    async def _ensure_peer(self):
        if self.peer and self.peer.connectionState != 'closed':
            return self.peer
        configuration = await asyncio.to_thread(
            load_rtc_configuration,
            self.config.backend_url,
            self.config.service_token,
            self.session_id,
        )
        self.video_count = 0
        self.peer = RTCPeerConnection(configuration=configuration)
        self.peer.on('track', self._on_track)
        self.peer.on('connectionstatechange', self._on_connection_state)
        return self.peer

    def _on_track(self, track):
        if track.kind == 'audio':
            coroutine = segment_audio_track(
                track, self.config.audio_segment_seconds, self._emit_evidence,
            )
        else:
            frame_type = 'camera' if self.video_count == 0 else 'screen'
            self.video_count += 1
            coroutine = sample_video_track(
                track,
                frame_type,
                self.config.capture_interval_seconds,
                self.config.max_image_bytes,
                self._emit_evidence,
            )
        task = asyncio.create_task(coroutine)
        self.media_tasks.add(task)
        task.add_done_callback(self.media_tasks.discard)

    async def _on_connection_state(self):
        if self.peer and self.peer.connectionState in {'failed', 'closed'}:
            logger.warning('WebRTC recorder %s: %s', self.session_id, self.peer.connectionState)

    async def _emit_evidence(self, event, payload):
        try:
            await self.signaling.emit(event, payload)
        except (ConnectionError, OSError) as error:
            logger.warning('Evidencia %s no enviada: %s', event, error)

    async def _close_peer(self):
        peer, self.peer = self.peer, None
        self.pending_ice.clear()
        for task in tuple(self.media_tasks):
            task.cancel()
        await asyncio.gather(*self.media_tasks, return_exceptions=True)
        self.media_tasks.clear()
        if peer:
            await peer.close()

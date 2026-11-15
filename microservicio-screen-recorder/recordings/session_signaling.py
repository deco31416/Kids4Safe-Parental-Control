import asyncio

from recordings.socket_runtime import SocketRuntime


class SessionSignaling:
    def __init__(self, config, session_id, loop, callbacks):
        self.session_id = session_id
        self.loop = loop
        self.callbacks = callbacks
        self.socket = SocketRuntime(config.backend_url, config.service_token)
        self.socket.on('connect', self._connected)
        self.socket.on('joined', self._joined)
        self.socket.on('publisher-ready', self._publisher_ready)
        self.socket.on('webrtc-offer', self._offer)
        self.socket.on('webrtc-ice', self._ice)
        self.socket.on('session-ended', self._ended)
        self.socket.on('disconnect', self._disconnected)

    def _connected(self):
        self.socket.emit('join-session', {'sessionId': self.session_id, 'role': 'recorder'})

    def _joined(self, _payload):
        # El backend emite publisher-ready cuando corresponde; evita offers duplicadas.
        return None

    def _publisher_ready(self, _payload):
        self.socket.emit('webrtc-start', {'sessionId': self.session_id})

    def _offer(self, payload):
        self._schedule(self.callbacks.on_offer(payload))

    def _ice(self, payload):
        self._schedule(self.callbacks.on_ice(payload))

    def _ended(self, _payload):
        self._schedule(self.callbacks.on_ended())

    def _disconnected(self):
        self._schedule(self.callbacks.on_disconnected())

    def _schedule(self, coroutine):
        asyncio.run_coroutine_threadsafe(coroutine, self.loop)

    async def emit(self, event: str, payload: dict):
        body = {'sessionId': self.session_id, **payload}
        await asyncio.to_thread(self.socket.emit, event, body)

    def run(self):
        self.socket.run()

    def stop(self):
        self.socket.stop()

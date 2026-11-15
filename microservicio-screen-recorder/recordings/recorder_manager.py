import asyncio
import logging

from recordings.control_signaling import ControlSignaling
from recordings.recorder_config import RecorderConfig
from recordings.session_recorder import SessionRecorder

logger = logging.getLogger(__name__)


class RecorderManager:
    def __init__(self, config: RecorderConfig):
        self.config = config
        self.control: ControlSignaling | None = None
        self.control_task: asyncio.Task | None = None
        self.sessions: dict[str, SessionRecorder] = {}
        self.lock = asyncio.Lock()

    async def start(self):
        if not self.config.enabled:
            logger.info('Evidence recorder deshabilitado')
            return
        loop = asyncio.get_running_loop()
        self.control = ControlSignaling(self.config, loop, self.start_session)
        self.control_task = asyncio.create_task(asyncio.to_thread(self.control.run))
        logger.info('Evidence recorder habilitado')

    async def start_session(self, session_id: str):
        async with self.lock:
            if session_id in self.sessions:
                return
            recorder = SessionRecorder(
                self.config,
                session_id,
                asyncio.get_running_loop(),
                self.stop_session,
            )
            self.sessions[session_id] = recorder
            await recorder.start()
            logger.info('Recorder iniciado para %s', session_id)

    async def stop_session(self, session_id: str):
        async with self.lock:
            recorder = self.sessions.pop(session_id, None)
        if recorder:
            await recorder.stop()
            logger.info('Recorder detenido para %s', session_id)

    async def stop(self):
        if self.control:
            self.control.stop()
        async with self.lock:
            recorders = list(self.sessions.values())
            self.sessions.clear()
        await asyncio.gather(*(recorder.stop() for recorder in recorders), return_exceptions=True)
        if self.control_task:
            try:
                await asyncio.wait_for(self.control_task, timeout=5)
            except TimeoutError:
                self.control_task.cancel()

    def health(self):
        if not self.config.enabled:
            return {'status': 'disabled', 'activeSessions': 0}
        connected = bool(self.control and self.control.connected)
        return {
            'status': 'healthy' if connected else 'reconnecting',
            'activeSessions': len(self.sessions),
        }

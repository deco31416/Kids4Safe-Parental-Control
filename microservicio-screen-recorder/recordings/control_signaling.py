import asyncio

from recordings.socket_runtime import SocketRuntime


class ControlSignaling:
    def __init__(self, config, loop, start_session):
        self.loop = loop
        self.start_session = start_session
        self.socket = SocketRuntime(config.backend_url, config.service_token)
        self.socket.on('connect', self._connected)
        self.socket.on('recorder-registered', self._registered)
        self.socket.on('recorder-session-start', self._session_start)

    def _connected(self):
        self.socket.emit('recorder-register')

    def _registered(self, payload):
        for session_id in payload.get('sessionIds', []):
            self._schedule(session_id)

    def _session_start(self, payload):
        self._schedule(payload.get('sessionId'))

    def _schedule(self, session_id):
        if isinstance(session_id, str) and session_id:
            asyncio.run_coroutine_threadsafe(self.start_session(session_id), self.loop)

    def run(self):
        self.socket.run()

    def stop(self):
        self.socket.stop()

    @property
    def connected(self):
        return self.socket.connected

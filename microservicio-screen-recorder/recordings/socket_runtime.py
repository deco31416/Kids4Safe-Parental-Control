import logging
import threading
from collections.abc import Callable

import socketio

logger = logging.getLogger(__name__)
NAMESPACE = '/realtime'


class SocketRuntime:
    def __init__(self, backend_url: str, service_token: str):
        self.backend_url = backend_url
        self.service_token = service_token
        self.client = socketio.Client(reconnection=True, logger=False, engineio_logger=False)
        self.stop_event = threading.Event()
        self.emit_lock = threading.Lock()

    def run(self):
        delay = 1
        while not self.stop_event.is_set():
            try:
                self.client.connect(
                    self.backend_url,
                    auth={'serviceToken': self.service_token},
                    namespaces=[NAMESPACE],
                    transports=['polling'],
                    wait_timeout=10,
                )
                delay = 1
                self.client.wait()
            except Exception as error:
                logger.warning('Socket recorder desconectado: %s', error)
            finally:
                if self.client.connected:
                    self.client.disconnect()
            if not self.stop_event.wait(delay):
                delay = min(delay * 2, 30)

    def on(self, event: str, handler: Callable):
        self.client.on(event, handler, namespace=NAMESPACE)

    def emit(self, event: str, payload: dict | None = None):
        if not self.client.connected:
            raise ConnectionError('Recorder signaling is disconnected')
        with self.emit_lock:
            self.client.emit(event, payload or {}, namespace=NAMESPACE)

    def stop(self):
        self.stop_event.set()
        if self.client.connected:
            self.client.disconnect()

    @property
    def connected(self):
        return self.client.connected

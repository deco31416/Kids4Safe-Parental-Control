import json
from urllib.parse import quote
from urllib.request import Request, urlopen

from aiortc import RTCConfiguration, RTCIceServer

FALLBACK = [RTCIceServer(urls='stun:stun.l.google.com:19302')]


def load_rtc_configuration(backend_url: str, service_token: str, session_id: str):
    request = Request(
        f'{backend_url}/webrtc/ice-servers?sessionId={quote(session_id)}',
        headers={
            'Accept': 'application/json',
            'X-Recorder-Service-Token': service_token,
            'X-Session-Id': session_id,
        },
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode('utf-8'))
        servers = [_to_ice_server(item) for item in payload.get('iceServers', [])]
        return RTCConfiguration(iceServers=servers or FALLBACK)
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return RTCConfiguration(iceServers=FALLBACK)


def _to_ice_server(item: dict):
    urls = item.get('urls')
    if not isinstance(urls, (str, list)) or not urls:
        raise ValueError('Invalid ICE server')
    return RTCIceServer(
        urls=urls,
        username=item.get('username'),
        credential=item.get('credential'),
    )

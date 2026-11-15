import math
import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
import main


@pytest.mark.parametrize("patch", [
    {"lat": 91}, {"lat": math.nan}, {"lat": math.inf}, {"lng": -181},
    {"accuracy": -1}, {"speed": -1}, {"heading": 361},
    {"sessionId": "<script>alert(1)</script>"}, {"sessionId": "=formula"},
    {"sessionId": "x" * 129}, {"source": "gps\r\ninjected"},
])
def test_malformed_location_points_are_rejected(patch):
    payload = {"sessionId": "session-1", "lat": 4.6, "lng": -74.1}
    payload.update(patch)
    with pytest.raises(ValidationError):
        main.TrackPointPayload(**payload)


def test_normal_location_payload_keeps_the_same_values():
    point = main.TrackPointPayload(sessionId="mobile-direct:unit_1", lat=4.6, lng=-74.1, accuracy=15, precision="exact")
    assert point.lat == 4.6
    assert point.lng == -74.1
    assert point.source == "gps_or_wifi"


def test_credentialed_cors_does_not_allow_every_origin():
    middleware = next(item for item in main.app.user_middleware if item.cls.__name__ == "CORSMiddleware")
    assert "*" not in middleware.kwargs["allow_origins"]


def test_deleting_a_route_targets_only_its_session_and_is_idempotent(monkeypatch):
    queries = []
    def delete_many(query):
        queries.append(query)
        return SimpleNamespace(deleted_count=2 if len(queries) == 1 else 0)
    monkeypatch.setattr(main, "col", SimpleNamespace(delete_many=delete_many))
    assert asyncio.run(main.delete_route("own-session"))["deletedCount"] == 2
    assert asyncio.run(main.delete_route("own-session"))["deletedCount"] == 0
    assert queries == [{"sessionId": "own-session"}, {"sessionId": "own-session"}]

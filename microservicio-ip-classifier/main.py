"""IP and device classification service for trusted backend-to-backend calls."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import ipaddress
import json
import logging
import os
from typing import Any, Dict, Literal, Optional, Tuple

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from user_agents import parse as parse_user_agent

from shared import CommonSettings, require_admin_api_key, setup_logging

load_dotenv(dotenv_path=".env.local", override=False)
settings = CommonSettings()
settings.SERVICE_NAME = "ip-classifier-service"
logger = setup_logging(settings.SERVICE_NAME, settings.LOG_LEVEL)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
outbound_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global outbound_client
    outbound_client = httpx.AsyncClient(
        timeout=httpx.Timeout(settings.OUTBOUND_TIMEOUT_SECONDS),
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        follow_redirects=False,
        headers={"User-Agent": "Kids4Safe-IP-Classifier/1.1.0"},
    )
    try:
        yield
    finally:
        await outbound_client.aclose()
        outbound_client = None


app = FastAPI(
    title="IP Classifier & Device Detection",
    description="Clasificación interna de IP pública, dispositivo y red.",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


class IPClassificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_agent_override: Optional[str] = Field(default=None, min_length=1, max_length=4096)
    metadata: Dict[str, str] = Field(default_factory=dict, max_length=32)

    @model_validator(mode="after")
    def validate_metadata_size(self):
        if len(json.dumps(self.metadata, ensure_ascii=True)) > 4096:
            raise ValueError("metadata must not exceed 4096 serialized characters")
        return self


class IPClassificationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ip_public: str
    ip_version: Literal["IPv4", "IPv6", "unknown"]
    device_type: Literal["mobile", "desktop", "tablet", "bot", "unknown"]
    device_brand: Optional[str] = None
    device_model: Optional[str] = None
    os: str
    os_version: Optional[str] = None
    browser: str
    browser_version: Optional[str] = None
    network_type: Literal["mobile", "broadband", "unknown"]
    user_agent: str
    is_mobile: bool
    is_tablet: bool
    is_pc: bool
    is_bot: bool
    timestamp: str
    headers_analyzed: Dict[str, str] = Field(default_factory=dict)


class GeolocationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    ip: str
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = Field(default=None, max_length=2)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    accuracy: float = Field(default=5000, ge=0)
    provider: str
    timezone: Optional[str] = None
    isp: Optional[str] = None
    asn: Optional[str] = None


def _parse_ip(value: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    candidate = value.strip().strip('"').strip("'")
    if not candidate:
        return None
    if candidate.startswith("[") and "]" in candidate:
        candidate = candidate[1 : candidate.index("]")]
    elif candidate.count(":") == 1 and "." in candidate:
        host, port = candidate.rsplit(":", 1)
        if port.isdigit():
            candidate = host
    try:
        return ipaddress.ip_address(candidate)
    except ValueError:
        return None


def is_public_ip(value: str) -> bool:
    parsed = _parse_ip(value)
    return parsed is not None and _is_routable_public(parsed)


def _is_routable_public(
    parsed: ipaddress.IPv4Address | ipaddress.IPv6Address,
) -> bool:
    return (
        parsed.is_global
        and not parsed.is_multicast
        and not parsed.is_reserved
        and not parsed.is_unspecified
        and not parsed.is_loopback
        and not parsed.is_link_local
        and not parsed.is_private
    )


def detect_ip_version(value: str) -> Literal["IPv4", "IPv6", "unknown"]:
    parsed = _parse_ip(value)
    if isinstance(parsed, ipaddress.IPv4Address):
        return "IPv4"
    if isinstance(parsed, ipaddress.IPv6Address):
        return "IPv6"
    return "unknown"


def extract_real_public_ip(request: Request) -> Tuple[str, Dict[str, str]]:
    """Accept only the IP header produced by the authenticated backend."""
    trusted_header = settings.TRUSTED_IP_HEADER.lower()
    header_value = request.headers.get(trusted_header)
    if header_value:
        candidate = header_value.split(",", 1)[0].strip()
        parsed = _parse_ip(candidate)
        if parsed is not None:
            normalized = str(parsed)
            return normalized, {trusted_header: normalized}

    socket_ip = request.client.host if request.client else "unknown"
    parsed_socket = _parse_ip(socket_ip)
    if parsed_socket is not None:
        return str(parsed_socket), {}
    return "unknown", {}


def require_public_ip(value: str) -> str:
    parsed = _parse_ip(value)
    if parsed is None or not _is_routable_public(parsed):
        raise HTTPException(status_code=422, detail="A valid public IP address is required")
    return str(parsed)


def classify_device_and_network(user_agent: str) -> Dict[str, Any]:
    ua = parse_user_agent(user_agent)

    if ua.is_bot:
        device_type = "bot"
        network_type = "unknown"
    elif ua.is_tablet:
        device_type = "tablet"
        network_type = "mobile" if "mobile" in user_agent.lower() else "broadband"
    elif ua.is_mobile:
        device_type = "mobile"
        network_type = "mobile"
    elif ua.is_pc:
        device_type = "desktop"
        network_type = "broadband"
    else:
        device_type = "unknown"
        network_type = "unknown"

    return {
        "device_type": device_type,
        "device_brand": ua.device.brand or None,
        "device_model": ua.device.model or None,
        "os": ua.os.family or "Unknown",
        "os_version": ua.os.version_string or None,
        "browser": ua.browser.family or "Unknown",
        "browser_version": ua.browser.version_string or None,
        "network_type": network_type,
        "is_mobile": ua.is_mobile,
        "is_tablet": ua.is_tablet,
        "is_pc": ua.is_pc,
        "is_bot": ua.is_bot,
    }


def _log_event(level: int, action: str, **fields: Any) -> None:
    safe_fields = {key: value for key, value in fields.items() if value is not None}
    logger.log(level, json.dumps({"action": action, **safe_fields}, ensure_ascii=True))


@app.get("/")
def root():
    return {
        "service": "IP Classifier & Device Detection",
        "status": "running",
        "version": "1.1.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.SERVICE_NAME,
        "version": "1.1.0",
    }


@app.post(
    "/collect",
    response_model=IPClassificationResponse,
    dependencies=[Depends(require_admin_api_key)],
)
def collect_ip_and_device(
    request: Request,
    payload: Optional[IPClassificationRequest] = None,
    user_agent: Optional[str] = Header(default=None, alias="User-Agent", max_length=4096),
):
    ip_public, headers_analyzed = extract_real_public_ip(request)
    final_user_agent = payload.user_agent_override if payload and payload.user_agent_override else user_agent
    if not final_user_agent:
        raise HTTPException(
            status_code=400,
            detail="User-Agent header is required for device classification",
        )

    try:
        classification = classify_device_and_network(final_user_agent)
        response = IPClassificationResponse(
            ip_public=ip_public,
            ip_version=detect_ip_version(ip_public),
            **classification,
            user_agent=final_user_agent,
            timestamp=datetime.now(timezone.utc).isoformat(),
            headers_analyzed=headers_analyzed,
        )
    except (TypeError, ValueError) as exc:
        _log_event(logging.ERROR, "classification_failed", error_type=type(exc).__name__)
        raise HTTPException(status_code=500, detail="Unable to classify device") from exc

    _log_event(
        logging.INFO,
        "device_classified",
        device_type=response.device_type,
        network_type=response.network_type,
        os=response.os,
    )
    return response


@app.post(
    "/geolocate",
    response_model=GeolocationResponse,
    dependencies=[Depends(require_admin_api_key)],
)
async def geolocate_ip(
    request: Request,
    ip_override: Optional[str] = Query(default=None, max_length=64),
):
    extracted_ip, _ = extract_real_public_ip(request)
    ip_public = require_public_ip(ip_override or extracted_ip)

    providers = []
    if settings.IPAPI_CO_ENABLED:
        providers.append(("ipapi.co", ipapi_co_geolocate))
    if settings.IPGEOLOCATION_API_KEY:
        providers.append(("ipgeolocation.io", ipgeolocation_io_geolocate))
    if settings.IP_API_ENABLED and settings.ALLOW_INSECURE_IP_API and settings.ENV != "production":
        providers.append(("ip-api.com", ipapi_com_geolocate))

    for provider_name, provider_func in providers:
        try:
            result = await provider_func(ip_public)
            result["provider"] = provider_name
            validated = GeolocationResponse.model_validate(result)
            _log_event(
                logging.INFO,
                "geolocation_succeeded",
                provider=provider_name,
                country_code=validated.country_code,
            )
            return validated
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            _log_event(
                logging.WARNING,
                "geolocation_provider_failed",
                provider=provider_name,
                error_type=type(exc).__name__,
            )

    raise HTTPException(status_code=503, detail="No geolocation provider is available")


def _client() -> httpx.AsyncClient:
    if outbound_client is None:
        raise RuntimeError("Outbound HTTP client is not initialized")
    return outbound_client


async def ipapi_co_geolocate(ip: str) -> Dict[str, Any]:
    response = await _client().get(f"https://ipapi.co/{ip}/json/")
    response.raise_for_status()
    data = response.json()
    if data.get("error"):
        raise ValueError("Provider rejected the IP")
    return {
        "ip": ip,
        "city": data.get("city"),
        "region": data.get("region"),
        "country": data.get("country_name"),
        "country_code": data.get("country_code"),
        "lat": data.get("latitude"),
        "lng": data.get("longitude"),
        "accuracy": 5000,
        "timezone": data.get("timezone"),
        "isp": data.get("org"),
        "asn": data.get("asn"),
    }


async def ipgeolocation_io_geolocate(ip: str) -> Dict[str, Any]:
    response = await _client().get(
        "https://api.ipgeolocation.io/ipgeo",
        params={"apiKey": settings.IPGEOLOCATION_API_KEY, "ip": ip},
    )
    response.raise_for_status()
    data = response.json()
    return {
        "ip": ip,
        "city": data.get("city"),
        "region": data.get("state_prov"),
        "country": data.get("country_name"),
        "country_code": data.get("country_code2"),
        "lat": data.get("latitude"),
        "lng": data.get("longitude"),
        "accuracy": 5000,
        "timezone": (data.get("time_zone") or {}).get("name"),
        "isp": data.get("isp"),
        "asn": data.get("asn"),
    }


async def ipapi_com_geolocate(ip: str) -> Dict[str, Any]:
    """Development-only fallback; the free provider endpoint is plain HTTP."""
    response = await _client().get(
        f"http://ip-api.com/json/{ip}",
        params={
            "fields": "status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,as"
        },
    )
    response.raise_for_status()
    data = response.json()
    if data.get("status") != "success":
        raise ValueError("Provider rejected the IP")
    return {
        "ip": ip,
        "city": data.get("city"),
        "region": data.get("regionName"),
        "country": data.get("country"),
        "country_code": data.get("countryCode"),
        "lat": data.get("lat"),
        "lng": data.get("lon"),
        "accuracy": 5000,
        "timezone": data.get("timezone"),
        "isp": data.get("isp"),
        "asn": data.get("as"),
    }


@app.get(
    "/test/simulate",
    dependencies=[Depends(require_admin_api_key)],
)
def test_simulate(
    device: Literal["mobile", "desktop", "tablet", "bot"] = "mobile",
    os_name: Literal["android", "ios", "windows", "macos", "linux"] = Query(
        default="android", alias="os"
    ),
):
    test_user_agents = {
        "mobile-android": "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 Chrome/108.0 Mobile Safari/537.36",
        "mobile-ios": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Version/16.0 Mobile/15E148 Safari/604.1",
        "desktop-windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/108.0 Safari/537.36",
        "desktop-macos": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/108.0 Safari/537.36",
        "desktop-linux": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/108.0 Safari/537.36",
        "tablet-ios": "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) Version/16.0 Mobile/15E148 Safari/604.1",
        "bot-android": "Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)",
    }
    key = f"{device}-{os_name}"
    fallback_key = "bot-android" if device == "bot" else "mobile-android"
    test_ua = test_user_agents.get(key, test_user_agents[fallback_key])
    return {
        "test_params": {"device": device, "os": os_name},
        "classification": classify_device_and_network(test_ua),
    }


if __name__ == "__main__":
    import uvicorn

    _log_event(logging.INFO, "service_starting", port=settings.PORT)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=False,
        access_log=False,
    )

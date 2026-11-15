from fastapi import FastAPI, Depends
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Literal
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
import time

# Importar shared utilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import CommonSettings, require_admin_api_key, setup_logging, PolicyDecision, DeviceContext, Permission

load_dotenv(dotenv_path=".env.local", override=False)

settings = CommonSettings()
settings.SERVICE_NAME = "policy-engine-service"
settings.PORT = int(os.getenv("PORT", 5007))

logger = setup_logging(settings.SERVICE_NAME, settings.LOG_LEVEL)

app = FastAPI(
    title="Policy Engine Service (v3.1.0)",
    description="""⚖️ Microservicio EL DIFERENCIADOR - Policy decisions enterprise.
    
    Características v3.0:
    - Decide qué se permite según tipo QR, device, ubicación, rol admin
    - Input: qrPolicy + deviceContext + sessionState + geo
    - Output: allow_camera, allow_mic, require_screen, allow_continue, etc.
    - Stateless (no guarda nada)
    - Escalable horizontalmente
    - Control fino y trazable
    """,
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
start_time = time.time()

class GeofencePolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radiusMeters: float = Field(gt=0, le=1_000_000)


class QRPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    policyType: Literal[
        "STANDARD",
        "KYC_STRICT",
        "SCREEN_ONLY",
        "ONE_TIME",
        "LOCATION_REQUIRED",
    ] = "STANDARD"
    permissionsRequired: List[Permission] = Field(default_factory=list, max_length=5)
    ttlSeconds: Optional[int] = Field(default=None, ge=0, le=31_536_000)
    maxUses: Optional[int] = Field(default=None, ge=1, le=1_000_000)
    geofence: Optional[GeofencePolicy] = None


class SessionState(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sessionId: Optional[str] = Field(default=None, min_length=1, max_length=128)
    status: Optional[str] = Field(default=None, min_length=1, max_length=64)
    uses: int = Field(default=0, ge=0, le=1_000_000)


class GeoContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    isInsideFence: Optional[bool] = None


class EvaluatePolicyPayload(BaseModel):
    """Payload validado para evaluar una política."""
    model_config = ConfigDict(extra="forbid")

    qr_policy: QRPolicy
    device_context: Optional[DeviceContext] = None
    session_state: Optional[SessionState] = None
    geo: Optional[GeoContext] = None


class ValidatePermissionsPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    required: List[Permission] = Field(default_factory=list, max_length=5)
    granted: List[Permission] = Field(default_factory=list, max_length=5)


@app.get("/health")
async def health():
    """Health check enterprise"""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": "3.1.0",
        "uptime": int(time.time() - start_time),
        "stateless": True,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/")
async def root():
    return {
        "service": "Policy Engine Service v3.0 (El Diferenciador)",
        "status": "running",
        "port": settings.PORT,
        "docs": "/docs"
    }


@app.post("/policy/evaluate", dependencies=[Depends(require_admin_api_key)])
async def evaluate(payload: EvaluatePolicyPayload) -> PolicyDecision:
    """
    Evalúa policy y retorna decisiones
    
    Lógica:
    1. Lee qr_policy (permisos requeridos, tipo)
    2. Lee device_context (capabilities)
    3. Lee session_state (status)
    4. Lee geo (geofence si aplica)
    5. Decide: allow_*, require_*, allow_continue
    6. Retorna PolicyDecision con reason
    """
    policy = payload.qr_policy.model_dump(exclude_none=True)
    device = payload.device_context
    session = payload.session_state.model_dump(exclude_none=True) if payload.session_state else {}
    geo = payload.geo.model_dump(exclude_none=True) if payload.geo else {}
    
    # Defaults
    decision = PolicyDecision(
        allow_camera=True,
        allow_mic=True,
        allow_screen=False,
        require_screen=False,
        allow_location=True,
        allow_continue=True,
        required_permissions=[],
        reason="ok"
    )
    
    # 1. Permisos requeridos por QR policy
    required_perms = policy.get("permissionsRequired", [])
    decision.required_permissions = required_perms
    
    # 2. Policy type (KYC_STRICT, SCREEN_ONLY, etc.)
    policy_type = policy.get("policyType", "STANDARD")
    
    if policy_type == "KYC_STRICT":
        # KYC estricto: requiere camera + location
        decision.allow_camera = True
        decision.allow_mic = True
        decision.allow_location = True
        if "location" in required_perms and geo.get("lat") is None:
            decision.allow_continue = False
            decision.reason = "Location required but not provided"
    
    elif policy_type == "SCREEN_ONLY":
        # Solo screen share (ej. para remote support)
        decision.require_screen = True
        if device:
            caps = device.capabilities or {}
            if not caps.get("screenShare", False):
                decision.allow_continue = False
                decision.reason = "Screen share required but device doesn't support it"
            else:
                decision.allow_screen = True
        else:
            decision.allow_continue = False
            decision.reason = "Device context required for SCREEN_ONLY policy"
    
    elif policy_type == "ONE_TIME":
        # One-time: verificar maxUses
        max_uses = policy.get("maxUses", 1)
        current_uses = session.get("uses", 0)
        if current_uses >= max_uses:
            decision.allow_continue = False
            decision.reason = f"Max uses reached ({max_uses})"
    
    elif policy_type == "LOCATION_REQUIRED":
        # Debe estar dentro de geofence
        if not geo.get("isInsideFence"):
            decision.allow_continue = False
            decision.reason = "Location outside allowed geofence"
    
    # 3. Device capabilities check
    if device and decision.allow_continue:
        caps = device.capabilities or {}
        
        # Si device no tiene cámara y QR la requiere
        if "camera" in required_perms and not caps.get("camera", False):
            decision.allow_camera = False
            decision.allow_continue = False
            decision.reason = "Camera permission required but not available"
        
        # Si device no tiene mic y QR lo requiere
        if "mic" in required_perms and not caps.get("microphone", False):
            decision.allow_mic = False
            decision.allow_continue = False
            decision.reason = "Microphone permission required but not available"
        
        if "screen" in required_perms:
            if device.device_type == "mobile":
                decision.allow_screen = False
                decision.allow_continue = False
                decision.reason = "Screen share required but device is mobile (not supported)"
            elif not caps.get("screenShare", False):
                decision.allow_screen = False
                decision.allow_continue = False
                decision.reason = "Screen share permission required but not available"
            else:
                decision.allow_screen = True
    
    # 4. Session state check
    if session:
        status = session.get("status")
        if status in ["stopped", "expired"]:
            decision.allow_continue = False
            decision.reason = f"Session status is {status}"
    
    logger.info(f"✅ Policy evaluated: {policy_type} → {decision.allow_continue}")
    
    return decision


@app.post("/policy/validate-permissions", dependencies=[Depends(require_admin_api_key)])
async def validate_permissions(payload: ValidatePermissionsPayload):
    """
    Valida si los permisos otorgados cumplen con la policy
    
    payload: {
        required: ["camera", "mic", "location"],
        granted: ["camera", "mic"]
    }
    
    return: {valid: bool, missing: [...]}
    """
    required = list(dict.fromkeys(payload.required))
    granted = list(dict.fromkeys(payload.granted))
    granted_set = set(granted)

    missing = [permission for permission in required if permission not in granted_set]
    valid = len(missing) == 0
    
    return {
        "valid": valid,
        "required": required,
        "granted": granted,
        "missing": missing,
    }


if __name__ == "__main__":
    import uvicorn
    port = settings.PORT
    logger.info(f"🚀 Starting {settings.SERVICE_NAME} on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

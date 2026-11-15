from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection

# Importar shared utilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import CommonSettings, GeoPoint, require_admin_api_key, setup_logging

load_dotenv(dotenv_path=".env.local", override=False)

settings = CommonSettings()
settings.SERVICE_NAME = "audit-log-service"
settings.PORT = int(os.getenv("PORT", 5006))

logger = setup_logging(settings.SERVICE_NAME, settings.LOG_LEVEL)

mongo_client: Optional[MongoClient] = None
audit_collection: Optional[Collection] = None


def connect_mongodb():
    """Connects once at startup with bounded timeouts and creates required indexes."""
    client = MongoClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=settings.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        connectTimeoutMS=settings.MONGODB_CONNECT_TIMEOUT_MS,
        appname=settings.SERVICE_NAME,
    )
    client.admin.command("ping")
    collection = client.get_database()["audit_logs"]
    collection.create_index([("timestamp_ms", DESCENDING)])
    collection.create_index([("qr_id", ASCENDING), ("timestamp_ms", DESCENDING)])
    collection.create_index([("session_id", ASCENDING), ("timestamp_ms", DESCENDING)])
    collection.create_index([("event_type", ASCENDING), ("timestamp_ms", DESCENDING)])
    collection.create_index([("actor_id", ASCENDING), ("timestamp_ms", DESCENDING)])
    return client, collection


@asynccontextmanager
async def lifespan(_: FastAPI):
    global mongo_client, audit_collection
    try:
        mongo_client, audit_collection = await asyncio.to_thread(connect_mongodb)
        logger.info("MongoDB connected")
    except Exception:
        logger.exception("MongoDB connection failed")
        mongo_client = None
        audit_collection = None
    try:
        yield
    finally:
        if mongo_client is not None:
            mongo_client.close()
        mongo_client = None
        audit_collection = None

app = FastAPI(
    title="Audit Log Service (v3.0.2)",
    description="""📜 Microservicio OBLIGATORIO para gobierno/KYC - MongoDB audit logs.
    
    Características v3.0:
    - Registra TODOS los eventos críticos
    - Mongo con índices optimizados
    - Búsqueda por qrId, sessionId, eventType, fecha
    - Geo-tagging (lat/lng/country)
    - Consent versioning
    - Severidad (info, warning, critical)
    - NUNCA falla (silent logging)
    """,
    version="3.0.2",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
start_time = time.time()

cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=bool(cors_origins),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)


class WriteEventPayload(BaseModel):
    """Payload para escribir evento de auditoría"""
    qr_id: str = Field(min_length=1, max_length=128)
    session_id: str = Field(min_length=1, max_length=128)
    actor_type: Literal["user", "admin", "system"] = "user"
    actor_id: Optional[str] = Field(default=None, max_length=128)
    event_type: str = Field(min_length=1, max_length=100)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    consent_version: Optional[str] = Field(default=None, max_length=64)
    geo: Optional[GeoPoint] = None
    severity: Literal["info", "warning", "critical"] = "info"

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, value: Dict[str, Any]):
        if len(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) > 65_536:
            raise ValueError("metadata exceeds 64 KiB")
        return value


@app.get("/health")
def health():
    """Health check enterprise"""
    mongo_ok = False
    if audit_collection is not None:
        try:
            mongo_client.admin.command("ping")
            mongo_ok = True
        except Exception:
            logger.warning("MongoDB health check failed")
    
    payload = {
        "status": "healthy" if mongo_ok else "degraded",
        "service": settings.SERVICE_NAME,
        "version": "3.0.2",
        "uptime": int(time.time() - start_time),
        "mongodb": "connected" if mongo_ok else "DISCONNECTED",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    return payload if mongo_ok else JSONResponse(status_code=503, content=payload)


@app.get("/")
def root():
    return {
        "service": "Audit Log Service v3.0.2 (Gobierno/KYC)",
        "status": "running",
        "port": settings.PORT,
        "docs": "/docs"
    }


@app.post("/audit/event", dependencies=[Depends(require_admin_api_key)])
def write_event(payload: WriteEventPayload, request: Request):
    """
    Escribe evento de auditoría
    
    - NUNCA falla (silent logging)
    - Enriquece con IP, User-Agent, timestamp
    - Guarda en MongoDB
    - Retorna ok: true siempre
    """
    try:
        if audit_collection is None:
            logger.error("MongoDB not available, event not saved")
            return {"ok": False, "reason": "MongoDB not available"}
        
        now_ms = int(time.time() * 1000)
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        
        doc = {
            "timestamp_ms": now_ms,
            "qr_id": payload.qr_id,
            "session_id": payload.session_id,
            "actor_type": payload.actor_type,
            "actor_id": payload.actor_id,
            "event_type": payload.event_type,
            "metadata": payload.metadata,
            "consent_version": payload.consent_version,
            "ip": ip,
            "user_agent": ua,
            "geo": payload.geo.model_dump() if payload.geo else None,
            "severity": payload.severity,
        }
        
        result = audit_collection.insert_one(doc)
        logger.info(f"✅ Audit event: {payload.event_type} ({payload.session_id})")
        
        return {"ok": True, "event_id": str(result.inserted_id)}
    
    except Exception:
        logger.exception("Audit event failed")
        return {"ok": False, "reason": "Audit event could not be persisted"}


@app.get("/audit/search", dependencies=[Depends(require_admin_api_key)])
def search(
    qr_id: Optional[str] = Query(None, max_length=128),
    session_id: Optional[str] = Query(None, max_length=128),
    event_type: Optional[str] = Query(None, max_length=100),
    actor_type: Optional[Literal["user", "admin", "system"]] = Query(None),
    from_ms: Optional[int] = Query(None),
    to_ms: Optional[int] = Query(None),
    limit: int = Query(200, ge=1, le=500)
):
    """
    Búsqueda de eventos de auditoría
    
    - Filtros: qrId, sessionId, eventType, actorType, fecha
    - Limit máximo 500
    - Orden: timestamp_ms DESC
    """
    if audit_collection is None:
        raise HTTPException(503, "MongoDB not available")
    
    query = {}
    if qr_id:
        query["qr_id"] = qr_id
    if session_id:
        query["session_id"] = session_id
    if event_type:
        query["event_type"] = event_type
    if actor_type:
        query["actor_type"] = actor_type
    
    # Filtro de fecha
    if from_ms or to_ms:
        query["timestamp_ms"] = {}
        if from_ms:
            query["timestamp_ms"]["$gte"] = from_ms
        if to_ms:
            query["timestamp_ms"]["$lte"] = to_ms
    
    try:
        cursor = audit_collection.find(query).sort("timestamp_ms", DESCENDING).limit(min(limit, 500))
        docs = list(cursor)
        
        # Convertir ObjectId a string
        for doc in docs:
            doc["_id"] = str(doc["_id"])
        
        return {"count": len(docs), "items": docs}
    
    except Exception:
        logger.exception("Audit search failed")
        raise HTTPException(500, "Audit search failed")


@app.get("/audit/session/{session_id}/timeline", dependencies=[Depends(require_admin_api_key)])
def session_timeline(session_id: str = Path(min_length=1, max_length=128)):
    """
    Timeline completo de una sesión (cronológico)
    
    - Todos los eventos de esa sesión
    - Orden: timestamp_ms ASC
    """
    if audit_collection is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        cursor = audit_collection.find({"session_id": session_id}).sort("timestamp_ms", ASCENDING)
        docs = list(cursor)
        
        for doc in docs:
            doc["_id"] = str(doc["_id"])
        
        return {"session_id": session_id, "count": len(docs), "timeline": docs}
    
    except Exception:
        logger.exception("Audit timeline failed")
        raise HTTPException(500, "Audit timeline failed")


@app.get("/audit/stats", dependencies=[Depends(require_admin_api_key)])
def stats():
    """
    Estadísticas de auditoría (dashboard)
    
    - Total eventos
    - Por event_type (top 10)
    - Por severity (count)
    - Últimas 24h
    """
    if audit_collection is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        total = audit_collection.count_documents({})
        
        # Últimas 24h
        now_ms = int(time.time() * 1000)
        yesterday_ms = now_ms - (24 * 60 * 60 * 1000)
        last_24h = audit_collection.count_documents({"timestamp_ms": {"$gte": yesterday_ms}})
        
        # Por event_type (agregación)
        pipeline_events = [
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        by_event_type = list(audit_collection.aggregate(pipeline_events))
        
        # Por severity
        pipeline_severity = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
        ]
        by_severity = list(audit_collection.aggregate(pipeline_severity))
        
        return {
            "total_events": total,
            "last_24h": last_24h,
            "by_event_type": by_event_type,
            "by_severity": by_severity,
        }
    
    except Exception:
        logger.exception("Audit stats failed")
        raise HTTPException(500, "Audit stats failed")


if __name__ == "__main__":
    import uvicorn
    port = settings.PORT
    logger.info(f"🚀 Starting {settings.SERVICE_NAME} on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

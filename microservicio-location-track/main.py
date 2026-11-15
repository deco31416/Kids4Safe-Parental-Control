"""
Location Track Service v3.0.1
📍 Historial de ubicación + ruta + playback + export

Guarda todos los puntos GPS en MongoDB TimeSeries
Calcula distancia recorrida, duración, velocidad promedio
Export: GeoJSON, CSV
"""
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated, Optional, List, Literal
from datetime import datetime, timedelta
import os
import sys
from dotenv import load_dotenv
import time
import json
import math

# Importar shared utilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import CommonSettings, require_admin_api_key, setup_logging

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING
except ImportError:
    print("⚠️ pymongo not installed. Run: pip install pymongo")
    MongoClient = None

load_dotenv(dotenv_path=".env.local", override=False)

settings = CommonSettings()
settings.SERVICE_NAME = "location-track-service"
settings.PORT = int(os.getenv("PORT", 5008))

logger = setup_logging(settings.SERVICE_NAME)

app = FastAPI(
    title="Location Track Service (v3.0.1)",
    description="""📍 Microservicio enterprise para historial de ubicación.
    
    Características v3.0:
    - Guarda ruta completa (MongoDB TimeSeries)
    - Cálculo de distancia recorrida (haversine)
    - Velocidad promedio
    - Duración de sesión
    - Export: GeoJSON, CSV
    - Playback histórico
    """,
    version="3.0.1",
    docs_url="/docs",
    redoc_url="/redoc",
)
start_time = time.time()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(',') if origin.strip() and origin.strip() != '*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongo_client = None
db = None
col = None

if MongoClient and settings.MONGODB_URI:
    try:
        mongo_client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
        db = mongo_client["qr_kraken"]
        col = db["location_points"]
        
        # Crear índices
        col.create_index([("sessionId", ASCENDING), ("ts", DESCENDING)])
        col.create_index([("ts", DESCENDING)])
        
        logger.info("✅ MongoDB connected")
    except Exception as e:
        logger.warning("⚠️ MongoDB connection failed: %s", type(e).__name__)


SessionId = Annotated[str, Field(min_length=1, max_length=128, pattern=r'^[A-Za-z0-9._:-]+$')]


class TrackPointPayload(BaseModel):
    """Payload para guardar punto de ubicación"""
    model_config = ConfigDict(allow_inf_nan=False)
    sessionId: SessionId
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0)
    precision: Optional[Literal["exact", "approx", "low"]] = None
    source: str = Field(default="gps_or_wifi", min_length=1, max_length=64, pattern=r'^[A-Za-z0-9_-]+$')
    speed: Optional[float] = Field(default=None, ge=0)
    heading: Optional[float] = Field(default=None, ge=0, le=360)


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calcula distancia en metros entre dos puntos"""
    R = 6371000  # Radio de la Tierra en metros
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def compute_advanced_stats(points: list) -> dict:
    """
    📊 Calcula estadísticas avanzadas de la ruta.
    
    Returns:
        dict con distance_m, duration_s, avg_speed_mps, max_speed_mps, quality
    """
    if len(points) < 2:
        return {
            "distance_m": 0.0,
            "duration_s": 0.0,
            "avg_speed_mps": 0.0,
            "max_speed_mps": 0.0,
            "quality": {"exact_pct": 0, "approx_pct": 0, "low_pct": 0, "points": len(points)}
        }
    
    # Calcular distancia total y velocidad máxima
    total_distance = 0.0
    max_speed = 0.0
    
    for i in range(1, len(points)):
        prev = points[i - 1]
        curr = points[i]
        
        # Distancia entre puntos consecutivos
        d = haversine_distance(prev["lat"], prev["lng"], curr["lat"], curr["lng"])
        total_distance += d
        
        # Velocidad instantánea
        dt = (curr["ts"] - prev["ts"]).total_seconds()
        if dt > 0:
            speed = d / dt
            max_speed = max(max_speed, speed)
    
    # Duración total
    duration = (points[-1]["ts"] - points[0]["ts"]).total_seconds()
    
    # Velocidad promedio
    avg_speed = total_distance / duration if duration > 0 else 0.0
    
    # Calidad de precisión
    exact = sum(1 for p in points if p.get("precision") == "exact")
    approx = sum(1 for p in points if p.get("precision") == "approx")
    low = sum(1 for p in points if p.get("precision") == "low")
    total = max(1, len(points))
    
    return {
        "distance_m": round(total_distance, 2),
        "duration_s": round(duration, 2),
        "avg_speed_mps": round(avg_speed, 3),
        "max_speed_mps": round(max_speed, 3),
        "quality": {
            "exact_pct": round(exact * 100 / total, 2),
            "approx_pct": round(approx * 100 / total, 2),
            "low_pct": round(low * 100 / total, 2),
            "points": len(points)
        }
    }


def evaluate_alerts(last_point: dict, prev_point: dict = None) -> list:
    """
    🚨 Evalúa alertas en tiempo real basadas en reglas enterprise.
    
    Alertas:
    - PRECISION_DROP: accuracy > 200m
    - SPEED_ANOMALY: velocidad > 60 m/s (~216 km/h)
    - JUMP_ANOMALY: salto > 500m en < 5s
    """
    alerts = []
    
    # Alerta de precisión baja
    acc = last_point.get("accuracy")
    if acc is not None and acc > 200:
        alerts.append({
            "type": "PRECISION_DROP",
            "severity": "warn",
            "message": f"Precisión baja: {round(acc)}m",
            "meta": {"accuracy": acc}
        })
    
    # Alertas de velocidad y saltos (requieren punto previo)
    if prev_point:
        d = haversine_distance(
            prev_point["lat"], prev_point["lng"],
            last_point["lat"], last_point["lng"]
        )
        
        dt = last_point.get("timestampMs", 0) - prev_point.get("timestampMs", 0)
        dt_seconds = max(1.0, dt / 1000.0)
        
        # Alerta de salto anómalo (teletransporte)
        if d > 500 and dt_seconds < 5:
            alerts.append({
                "type": "JUMP_ANOMALY",
                "severity": "high",
                "message": f"Salto de {round(d)}m en {round(dt_seconds, 1)}s",
                "meta": {"meters": round(d, 2), "seconds": round(dt_seconds, 2)}
            })
        
        # Alerta de velocidad anómala
        speed = d / dt_seconds
        if speed > 60:  # 60 m/s = 216 km/h
            alerts.append({
                "type": "SPEED_ANOMALY",
                "severity": "warn",
                "message": f"Velocidad anómala: {round(speed * 3.6, 1)} km/h",
                "meta": {"mps": round(speed, 3), "kmh": round(speed * 3.6, 1)}
            })
    
    return alerts


@app.get("/health")
async def health():
    """Health check enterprise"""
    mongo_ok = False
    if mongo_client:
        try:
            mongo_client.admin.command("ping")
            mongo_ok = True
        except Exception:
            pass

    payload = {
        "status": "healthy" if mongo_ok else "degraded",
        "service": settings.SERVICE_NAME,
        "version": "3.0.1",
        "uptime": int(time.time() - start_time),
        "mongodb": "connected" if mongo_ok else "disconnected",
        "timestamp": datetime.now().isoformat()
    }
    return payload if mongo_ok else JSONResponse(status_code=503, content=payload)


@app.get("/")
async def root():
    return {
        "service": "Location Track Service v3.0",
        "status": "running",
        "port": settings.PORT,
        "docs": "/docs"
    }


@app.post("/track/point", dependencies=[Depends(require_admin_api_key)])
async def track_point(payload: TrackPointPayload):
    """
    📍 Guarda punto de ubicación en historial
    
    Cada punto se guarda con timestamp para poder:
    - Reconstruir ruta completa
    - Calcular distancia recorrida
    - Hacer playback temporal
    - Export GeoJSON/CSV
    """
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    
    doc = {
        "sessionId": payload.sessionId,
        "ts": datetime.utcnow(),
        "lat": payload.lat,
        "lng": payload.lng,
        "accuracy": payload.accuracy,
        "precision": payload.precision,
        "source": payload.source,
        "speed": payload.speed,
        "heading": payload.heading,
    }
    
    try:
        result = col.insert_one(doc)
        logger.info(f"✅ Point saved: {payload.sessionId} @ ({payload.lat}, {payload.lng})")
        
        return {
            "ok": True,
            "pointId": str(result.inserted_id),
            "timestamp": doc["ts"].isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error saving point: {e}")
        raise HTTPException(500, f"Failed to save point: {e}")


@app.get("/track/route/{sessionId}", dependencies=[Depends(require_admin_api_key)])
async def get_route(
    sessionId: SessionId,
    limit: int = Query(5000, ge=1, le=10000, description="Max points to return")
):
    """
    🗺️ Obtiene ruta completa de una sesión
    
    Devuelve todos los puntos ordenados cronológicamente
    para dibujar polyline en mapa
    """
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        points = list(
            col.find(
                {"sessionId": sessionId},
                {"_id": 0}
            )
            .sort("ts", ASCENDING)
            .limit(limit)
        )
        
        # Convertir datetime a ISO string
        for p in points:
            if "ts" in p and isinstance(p["ts"], datetime):
                p["ts"] = p["ts"].isoformat()
        
        return {
            "sessionId": sessionId,
            "points": points,
            "count": len(points)
        }
    except Exception as e:
        logger.error(f"❌ Error getting route: {e}")
        raise HTTPException(500, f"Failed to get route: {e}")


@app.delete("/track/route/{sessionId}", dependencies=[Depends(require_admin_api_key)])
async def delete_route(sessionId: SessionId):
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    try:
        result = col.delete_many({"sessionId": sessionId})
        return {"sessionId": sessionId, "deletedCount": result.deleted_count}
    except Exception as error:
        logger.error("Location deletion failed: %s", type(error).__name__)
        raise HTTPException(500, "Failed to delete route") from None


@app.get("/track/stats/{sessionId}", dependencies=[Depends(require_admin_api_key)])
async def get_stats(sessionId: SessionId):
    """
    📊 Estadísticas avanzadas de ruta
    
    Calcula:
    - Distancia total recorrida (metros/km)
    - Duración (segundos/minutos)
    - Velocidad promedio y máxima (km/h)
    - Calidad de precisión (% exact/approx/low)
    - Primer y último punto
    """
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        points = list(
            col.find(
                {"sessionId": sessionId}
            )
            .sort("ts", ASCENDING)
        )
        
        if len(points) < 2:
            return {
                "sessionId": sessionId,
                "totalPoints": len(points),
                "distanceMeters": 0,
                "distanceKm": 0,
                "durationSeconds": 0,
                "durationMinutes": 0,
                "avgSpeedKmh": 0,
                "maxSpeedKmh": 0,
                "quality": {"exact_pct": 0, "approx_pct": 0, "low_pct": 0, "points": len(points)}
            }
        
        # Usar función avanzada
        stats = compute_advanced_stats(points)
        
        # Agregar información de primer y último punto
        result = {
            "sessionId": sessionId,
            "totalPoints": len(points),
            "distanceMeters": stats["distance_m"],
            "distanceKm": round(stats["distance_m"] / 1000, 2),
            "durationSeconds": stats["duration_s"],
            "durationMinutes": round(stats["duration_s"] / 60, 2),
            "avgSpeedKmh": round(stats["avg_speed_mps"] * 3.6, 2),
            "maxSpeedKmh": round(stats["max_speed_mps"] * 3.6, 2),
            "quality": stats["quality"],
            "firstPoint": {
                "lat": points[0]["lat"],
                "lng": points[0]["lng"],
                "timestamp": points[0]["ts"].isoformat() if isinstance(points[0]["ts"], datetime) else points[0]["ts"],
                "precision": points[0].get("precision"),
                "accuracy": points[0].get("accuracy")
            },
            "lastPoint": {
                "lat": points[-1]["lat"],
                "lng": points[-1]["lng"],
                "timestamp": points[-1]["ts"].isoformat() if isinstance(points[-1]["ts"], datetime) else points[-1]["ts"],
                "precision": points[-1].get("precision"),
                "accuracy": points[-1].get("accuracy")
            }
        }
        
        return result
    except Exception as e:
        logger.error(f"❌ Error calculating stats: {e}")
        raise HTTPException(500, f"Failed to calculate stats: {e}")


@app.get("/track/export/{sessionId}", dependencies=[Depends(require_admin_api_key)])
async def export_route(
    sessionId: SessionId,
    format: Literal["geojson", "csv"] = Query("geojson", description="Export format")
):
    """
    📦 Export ruta en GeoJSON o CSV
    
    GeoJSON: compatible con mapas (Google Maps, QGIS, etc)
    CSV: compatible con Excel, análisis
    """
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        points = list(
            col.find(
                {"sessionId": sessionId},
                {"_id": 0}
            )
            .sort("ts", ASCENDING)
        )
        
        if format == "geojson":
            # GeoJSON LineString
            coordinates = [[p["lng"], p["lat"]] for p in points]  # [lng, lat] order for GeoJSON
            
            geojson = {
                "type": "Feature",
                "properties": {
                    "sessionId": sessionId,
                    "totalPoints": len(points),
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                }
            }
            
            return geojson
        
        elif format == "csv":
            # CSV simple
            csv_lines = ["sessionId,timestamp,lat,lng,accuracy,precision,source"]
            
            for p in points:
                ts = p["ts"].isoformat() if isinstance(p["ts"], datetime) else p["ts"]
                csv_lines.append(
                    f"{sessionId},{ts},{p['lat']},{p['lng']},{p.get('accuracy', '')},{p.get('precision', '')},{p.get('source', '')}"
                )
            
            return {
                "format": "csv",
                "data": "\n".join(csv_lines)
            }
    
    except Exception as e:
        logger.error(f"❌ Error exporting: {e}")
        raise HTTPException(500, f"Failed to export: {e}")


@app.post("/track/alerts/evaluate", dependencies=[Depends(require_admin_api_key)])
async def evaluate_alerts_endpoint(payload: dict):
    """
    🚨 Evalúa alertas en tiempo real
    
    Payload:
    - lastPoint: último punto recibido
    - prevPoint: punto anterior (opcional)
    
    Detecta:
    - PRECISION_DROP (accuracy > 200m)
    - SPEED_ANOMALY (> 216 km/h)
    - JUMP_ANOMALY (> 500m en < 5s)
    """
    try:
        last_point = payload.get("lastPoint")
        prev_point = payload.get("prevPoint")
        
        if not last_point:
            return {"alerts": []}
        
        alerts = evaluate_alerts(last_point, prev_point)
        
        return {"alerts": alerts}
    
    except Exception as e:
        logger.error(f"❌ Error evaluating alerts: {e}")
        return {"alerts": []}


@app.get("/track/report/{sessionId}", dependencies=[Depends(require_admin_api_key)])
async def generate_report(sessionId: SessionId):
    """
    📄 Genera reporte HTML de la sesión
    
    Incluye:
    - Estadísticas completas
    - Métricas de calidad
    - Mapa embebido (futuro)
    """
    if col is None:
        raise HTTPException(503, "MongoDB not available")
    
    try:
        # Obtener stats
        stats_response = await get_stats(sessionId)
        
        # Generar HTML
        html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reporte de Sesión - {sessionId}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    background: #f5f5f5;
                }}
                .container {{
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }}
                h1 {{
                    color: #1a1a1a;
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 10px;
                }}
                .section {{
                    margin: 20px 0;
                }}
                .metric {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e5e5;
                }}
                .metric-label {{
                    color: #666;
                    font-weight: 500;
                }}
                .metric-value {{
                    color: #1a1a1a;
                    font-weight: bold;
                }}
                .quality-bar {{
                    display: flex;
                    height: 30px;
                    margin: 10px 0;
                    border-radius: 4px;
                    overflow: hidden;
                }}
                .quality-exact {{
                    background: #22c55e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }}
                .quality-approx {{
                    background: #eab308;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }}
                .quality-low {{
                    background: #ef4444;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e5e5;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📍 Reporte de Ubicación</h1>
                
                <div class="section">
                    <h2>📊 Información de Sesión</h2>
                    <div class="metric">
                        <span class="metric-label">Session ID:</span>
                        <span class="metric-value">{sessionId}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Puntos registrados:</span>
                        <span class="metric-value">{stats_response['totalPoints']}</span>
                    </div>
                </div>
                
                <div class="section">
                    <h2>🗺️ Estadísticas de Ruta</h2>
                    <div class="metric">
                        <span class="metric-label">Distancia recorrida:</span>
                        <span class="metric-value">{stats_response['distanceKm']} km ({stats_response['distanceMeters']} m)</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Duración:</span>
                        <span class="metric-value">{stats_response['durationMinutes']} min ({stats_response['durationSeconds']} seg)</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Velocidad promedio:</span>
                        <span class="metric-value">{stats_response['avgSpeedKmh']} km/h</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Velocidad máxima:</span>
                        <span class="metric-value">{stats_response['maxSpeedKmh']} km/h</span>
                    </div>
                </div>
                
                <div class="section">
                    <h2>✅ Calidad de Precisión</h2>
                    <div class="quality-bar">
                        <div class="quality-exact" style="width: {stats_response['quality']['exact_pct']}%">
                            Exacto {stats_response['quality']['exact_pct']}%
                        </div>
                        <div class="quality-approx" style="width: {stats_response['quality']['approx_pct']}%">
                            Aprox {stats_response['quality']['approx_pct']}%
                        </div>
                        <div class="quality-low" style="width: {stats_response['quality']['low_pct']}%">
                            Bajo {stats_response['quality']['low_pct']}%
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>📌 Puntos de Inicio y Fin</h2>
                    <div class="metric">
                        <span class="metric-label">🟢 Inicio:</span>
                        <span class="metric-value">{stats_response['firstPoint']['lat']:.6f}, {stats_response['firstPoint']['lng']:.6f}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Timestamp:</span>
                        <span class="metric-value">{stats_response['firstPoint']['timestamp']}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">🔴 Fin:</span>
                        <span class="metric-value">{stats_response['lastPoint']['lat']:.6f}, {stats_response['lastPoint']['lng']:.6f}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Timestamp:</span>
                        <span class="metric-value">{stats_response['lastPoint']['timestamp']}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Kids4Safe v3.0</strong> - Location Track Service</p>
                    <p>Reporte generado el {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    <p style="font-size: 12px; color: #999;">
                        Cálculos basados en fórmula Haversine (ISO 19115)
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return {
            "format": "html",
            "sessionId": sessionId,
            "html": html
        }
    
    except Exception as e:
        logger.error(f"❌ Error generating report: {e}")
        raise HTTPException(500, f"Failed to generate report: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)

'use client';

import { Activity, Camera, Eye, EyeOff, MapPin, Mic, Monitor, Smartphone as SmartphoneIcon, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SessionData {
  sessionId: string;
  qrId: string;
  deviceInfo?: any;
  permissions?: any;
  lastHeartbeat?: number;
}

interface SessionMonitorProps {
  onViewStream?: (sessionId: string) => void;
}

export default function SessionMonitor({ onViewStream }: SessionMonitorProps) {
  const { socket, connected, activeSessions, joinSession, leaveSession } = useWebSocket();
  const [monitoredSessions, setMonitoredSessions] = useState<Set<string>>(new Set());
  const [sessionsArray, setSessionsArray] = useState<SessionData[]>([]);

  useEffect(() => {
    // Convertir Map a Array para renderizar
    setSessionsArray(Array.from(activeSessions.values()));
  }, [activeSessions]);

  const handleToggleMonitor = (sessionId: string) => {
    if (monitoredSessions.has(sessionId)) {
      leaveSession(sessionId);
      setMonitoredSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    } else {
      joinSession(sessionId);
      setMonitoredSessions(prev => new Set(prev).add(sessionId));
    }
  };

  const getTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Desconocido';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Monitor de Sesiones</h2>
          <p className="text-muted-foreground">
            {connected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                WebSocket conectado - {sessionsArray.length} sesiones activas
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Desconectado
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessionsArray.length === 0 ? (
        <Card className="bg-muted border-border">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay sesiones activas en este momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessionsArray.map((session) => {
            const isMonitored = monitoredSessions.has(session.sessionId);
            
            return (
              <Card key={session.sessionId} className="bg-muted border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Sesión
                      </CardTitle>
                      <p className="text-xs text-primary font-mono mt-1">
                        {session.sessionId.slice(0, 8)}...
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isMonitored ? "destructive" : "default"}
                      onClick={() => handleToggleMonitor(session.sessionId)}
                      className="ml-2"
                    >
                      {isMonitored ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Dejar
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Monitorear
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* QR Info */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">QR ID:</span>
                    <span className="text-foreground font-mono text-xs">
                      {session.qrId?.slice(0, 8) || 'N/A'}
                    </span>
                  </div>

                  {/* Last Heartbeat */}
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-muted-foreground">Último heartbeat:</span>
                    <span className="text-foreground">{getTimeAgo(session.lastHeartbeat)}</span>
                  </div>

                  {/* Device Info */}
                  {session.deviceInfo && (
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground">
                        <SmartphoneIcon className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> {session.deviceInfo.os || 'Unknown OS'} - {session.deviceInfo.browser || 'Unknown Browser'}
                      </p>
                      {session.deviceInfo.screenResolution && (
                        <p className="text-muted-foreground">
                          <Monitor className="inline-block h-4 w-4 shrink-0 align-middle text-primary" aria-hidden="true" /> {session.deviceInfo.screenResolution}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Permissions */}
                  {session.permissions && (
                    <div className="flex gap-2 flex-wrap">
                      {session.permissions.camera && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          <Camera className="w-3 h-3" />
                          Cámara
                        </span>
                      )}
                      {session.permissions.screen && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                          <Monitor className="w-3 h-3" />
                          Pantalla
                        </span>
                      )}
                      {session.permissions.microphone && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          <Mic className="w-3 h-3" />
                          Micrófono
                        </span>
                      )}
                      {session.permissions.location && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          <MapPin className="w-3 h-3" />
                          GPS
                        </span>
                      )}
                    </div>
                  )}

                  {/* Monitoring Status */}
                  {isMonitored && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-green-400 flex items-center gap-1 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Monitoreando en tiempo real
                      </p>
                      {onViewStream && (
                        <Button
                          size="sm"
                          className="w-full bg-primary hover:bg-primary"
                          onClick={() => onViewStream(session.sessionId)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Ver Streams en Vivo
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

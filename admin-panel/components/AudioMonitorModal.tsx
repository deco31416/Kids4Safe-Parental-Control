'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  Download, 
  AlertTriangle,
  Loader2,
  Info,
  RefreshCw,
  Settings,
  Trash2,
  Volume2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ActiveSession } from '@/lib/admin-api';

interface AudioClip {
  id: string;
  url: string;
  capturedAt: string;
  duration?: number;
  sizeBytes?: number;
}

interface AudioMonitorModalProps {
  session: ActiveSession | null;
  open: boolean;
  onClose: () => void;
}

export function AudioMonitorModal({ session, open, onClose }: AudioMonitorModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [capturePolicy, setCapturePolicy] = useState<any>(null);
  const [audioIntervalMs, setAudioIntervalMs] = useState(15000);

  useEffect(() => {
    if (open && session) {
      loadAudioConfig();
      loadAudioClips();
      
      // Auto-refresh cada 10 segundos
      const interval = setInterval(loadAudioClips, 10000);
      const realtimeUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      let realtimeSocket: Socket | null = null;

      if (realtimeUrl) {
        realtimeSocket = io(`${realtimeUrl}/realtime`, {
          auth: token ? { token } : undefined,
          transports: ['websocket', 'polling'],
        });

        realtimeSocket.on('connect', () => {
          realtimeSocket?.emit('join-session', {
            sessionId: session.sessionId,
            role: 'viewer',
            username: 'Admin',
          });
        });

        realtimeSocket.on('new-audio-clip', (data: any) => {
          if (!data?.sessionId || data.sessionId === session.sessionId) {
            void loadAudioClips();
          }
        });
      }

      return () => {
        clearInterval(interval);
        realtimeSocket?.disconnect();
      };
    }
  }, [open, session]);

  const getToken = () => sessionStorage.getItem('auth_token') || localStorage.getItem('token');

  const loadAudioConfig = async () => {
    if (!session?.qrId) return;

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!BACKEND_URL) return;

      const response = await fetch(`${BACKEND_URL}/qr/${session.qrId}/capture-policy`, {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const data = await response.json();
      const policy = data.capturePolicy || {};
      setCapturePolicy(policy);
      setAudioIntervalMs(Number(policy.intervals?.microphone ?? 15000));
    } catch (err) {
      console.error('Error cargando configuracion de audio:', err);
    }
  };

  const loadAudioClips = async () => {
    if (!session) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor inicia sesión.');
      }
      
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
      }
      
      const response = await fetch(
        `${BACKEND_URL}/audio-clips/session/${session.sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🎤 Audio clips recibidos:', data);
      setAudioClips(data.clips || []);
    } catch (err: any) {
      console.error('❌ Error cargando audio clips:', err);
      setError(err.message || 'Error al cargar audio clips');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadClip = (clip: AudioClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    a.download = `audio-clip-${clip.id}.mp3`;
    a.click();
  };

  const saveAudioConfig = async () => {
    if (!session?.qrId || isSavingConfig) return;

    try {
      setIsSavingConfig(true);
      setError(null);

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
      }

      const nextPolicy = {
        ...(capturePolicy || {}),
        intervals: {
          camera: Number(capturePolicy?.intervals?.camera ?? 15000),
          screen: Number(capturePolicy?.intervals?.screen ?? 15000),
          microphone: audioIntervalMs,
          gps: Number(capturePolicy?.intervals?.gps ?? 30000),
        },
        policyPreset: 'custom',
      };

      const response = await fetch(`${BACKEND_URL}/qr/${session.qrId}/capture-policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(nextPolicy),
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(raw || `Error guardando configuración (HTTP ${response.status})`);
      }

      setCapturePolicy(nextPolicy);
      setShowConfig(false);
    } catch (err: any) {
      console.error('Error guardando configuracion de audio:', err);
      setError(err.message || 'No se pudo guardar la configuración de audio');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const deleteSelectedClips = async () => {
    if (selectedClips.size === 0) return;
    if (!confirm(`¿Eliminar definitivamente ${selectedClips.size} clips de audio?`)) return;

    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      const response = await fetch(`${BACKEND_URL}/audio-clips/batch/multiple`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedClips) }),
      });

      if (response.ok) {
        setSelectedClips(new Set());
        await loadAudioClips();
      } else {
        throw new Error('Error al eliminar clips');
      }
    } catch (err: any) {
      console.error('Error eliminando clips:', err);
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllClips = async () => {
    if (!session || audioClips.length === 0) return;
    if (!confirm('¿Eliminar definitivamente TODOS los clips de audio de esta sesión?')) return;

    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/audio-clips/session/${session.sessionId}/all`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken() || ''}` },
        },
      );
      if (!response.ok) throw new Error(`Error eliminando audios (HTTP ${response.status})`);
      setSelectedClips(new Set());
      await loadAudioClips();
    } catch (err: any) {
      setError(err.message || 'No se pudieron eliminar los audios');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleClipSelection = (clipId: string) => {
    const newSelection = new Set(selectedClips);
    if (newSelection.has(clipId)) {
      newSelection.delete(clipId);
    } else {
      newSelection.add(clipId);
    }
    setSelectedClips(newSelection);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto qr-dialog-scroll bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Galería de Audio Clips Automáticos
            </DialogTitle>
            <DialogDescription className="sr-only">
              Reproduce, descarga o administra los clips de audio de la sesión seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header con acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 border-border bg-muted/40 text-foreground/70"
                >
                  <Volume2 className="w-3 h-3" />
                  {audioClips.length} clips
                </Badge>
              </div>
              
              <div className="flex gap-2">
                {selectedClips.size > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={deleteSelectedClips}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar ({selectedClips.size})
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteAllClips}
                  disabled={isDeleting || audioClips.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar todos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfig((current) => !current)}
                  className="border-border bg-card text-foreground hover:bg-muted"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadAudioClips}
                  className="border-border bg-card text-foreground hover:bg-muted"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </div>

            {showConfig && (
              <div className="rounded-lg border border-border bg-card p-4 text-foreground">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Intervalo de clips de audio</label>
                    <select
                      value={String(audioIntervalMs)}
                      onChange={(event) => setAudioIntervalMs(Number(event.target.value))}
                      className="h-10 w-full min-w-0 sm:w-56 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-blue-500"
                    >
                      <option value="5000">5 segundos</option>
                      <option value="10000">10 segundos</option>
                      <option value="15000">15 segundos</option>
                      <option value="30000">30 segundos</option>
                      <option value="60000">1 minuto</option>
                      <option value="120000">2 minutos</option>
                    </select>
                    <p className="text-xs text-foreground/60">
                      Clips de {Math.round(audioIntervalMs / 1000)}s. Un intervalo mayor reduce escrituras en el volumen.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={saveAudioConfig}
                    disabled={isSavingConfig}
                    className="bg-blue-600 hover:bg-blue-500 text-primary-foreground"
                  >
                    {isSavingConfig ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Configuración'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Info banner */}
            <Alert className="bg-muted/50 border-border text-foreground/80 [&>svg]:text-foreground/70">
              <Info className="w-4 h-4" />
              <AlertDescription>
                <strong>Sistema automático:</strong> Los clips de audio se capturan cada {Math.round(audioIntervalMs / 1000)} segundos desde el micrófono del usuario. 
                Se almacenan en el volumen privado del backend y siguen la política de retención configurada.
              </AlertDescription>
            </Alert>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-foreground/60" />
              </div>
            )}

            {/* Lista de audio clips */}
            {!isLoading && audioClips.length === 0 && (
              <div className="text-center py-12 text-foreground/60">
                <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2 text-foreground">No hay clips disponibles</p>
                <p className="text-sm">
                  Los clips aparecerán aquí cuando el sistema los capture automáticamente.
                </p>
              </div>
            )}

            {!isLoading && audioClips.length > 0 && (
              <div className="space-y-2">
                {audioClips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-3 sm:gap-4 sm:p-4 border border-border rounded-lg hover:bg-muted/60 transition-colors ${
                      selectedClips.has(clip.id) ? 'bg-muted/60 border-blue-500/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClips.has(clip.id)}
                      onChange={() => toggleClipSelection(clip.id)}
                      className="w-4 h-4 accent-blue-500"
                    />

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-foreground">
                          {new Date(clip.capturedAt).toLocaleString('es-ES')}
                        </span>
                        {clip.duration && (
                          <Badge className="border border-border bg-white text-muted-foreground text-xs">
                            {formatDuration(clip.duration)}
                          </Badge>
                        )}
                        {clip.sizeBytes && (
                          <Badge className="border border-border bg-muted text-foreground text-xs">
                            {formatFileSize(clip.sizeBytes)}
                          </Badge>
                        )}
                      </div>

                      <audio
                        controls
                        preload="metadata"
                        src={clip.url}
                        className="h-10 w-full min-w-0 rounded-md bg-card"
                        onPlay={() => setPlayingClipId(clip.id)}
                        onPause={() => {
                          if (playingClipId === clip.id) setPlayingClipId(null);
                        }}
                        onEnded={() => setPlayingClipId(null)}
                        onError={() => {
                          setPlayingClipId(null);
                          setError('No se pudo reproducir este audio. Intenta descargarlo o revisa el formato servido por el backend.');
                        }}
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadClip(clip)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

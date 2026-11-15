'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Monitor, 
  Camera, 
  Download, 
  AlertTriangle,
  Loader2,
  Info,
  RefreshCw,
  Clock,
  Image as ImageIcon,
  Settings,
  Video,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ActiveSession } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';

interface Screenshot {
  id: string;
  url: string;
  thumbnailUrl: string;
  capturedAt: string;
  type?: 'screen' | 'camera';
}

interface ScreenMonitorModalProps {
  session: ActiveSession | null;
  open: boolean;
  onClose: () => void;
}

export function ScreenMonitorModal({ session, open, onClose }: ScreenMonitorModalProps) {
  const { toast } = useToast();
  const isMobileAppSession = session?.source === 'mobile-app' || session?.qrId?.startsWith('mobile-direct:');
  const [isLoading, setIsLoading] = useState(true);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showSystemNotice, setShowSystemNotice] = useState(true);
  
  // Configuración de capturas
  const [captureConfig, setCaptureConfig] = useState({
    screenInterval: 15, // segundos
    cameraInterval: 15, // segundos
    captureScreen: true,
    captureCamera: true,
  });

  const readErrorMessage = async (res: Response): Promise<string> => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      const message = data?.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.filter(Boolean).join('\n');
      if (data) return JSON.stringify(data);
    }

    return res.text().catch(() => '');
  };

  const loadScreenshotConfig = async () => {
    if (!session?.qrId) return;
    if (isMobileAppSession) return;
    
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!BACKEND_URL) {
        console.error('NEXT_PUBLIC_BACKEND_URL no configurado');
        return;
      }
      
      const response = await fetch(
        `${BACKEND_URL}/qr/${session.qrId}/screenshot-config`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setCaptureConfig(data.config);
          console.log('✅ Configuración cargada:', data.config);
        }
      }
    } catch (error) {
      console.error('⚠️ Error cargando configuración:', error);
    }
  };

  const loadScreenshots = async () => {
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
        `${BACKEND_URL}/screenshots/session/${session.sessionId}`,
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
      console.log('📸 Capturas recibidas:', data);
      setScreenshots(data.screenshots || []);
      
      if (data.screenshots?.length > 0) {
        setSelectedImage(data.screenshots[0].url);
        setSelectedIndex(0);
      }
    } catch (err: any) {
      console.error('Error cargando capturas:', err);
      setError(err.message || 'No se pudieron cargar las capturas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!session || !open) return;

    loadScreenshotConfig();
    loadScreenshots();

    // Auto-refresh cada 10 segundos
    const interval = setInterval(loadScreenshots, 10000);

    const realtimeUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
    let realtimeSocket: Socket | null = null;

    if (realtimeUrl) {
      realtimeSocket = io(`${realtimeUrl}/realtime`, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
      });

      const handleNewScreenshot = (data: any) => {
        if (!data?.sessionId || data.sessionId === session.sessionId) {
          void loadScreenshots();
        }
      };

      realtimeSocket.on('connect', () => {
        realtimeSocket?.emit('join-session', {
          sessionId: session.sessionId,
          role: 'viewer',
          username: 'Admin',
        });
      });
      realtimeSocket.on('new-screenshot', handleNewScreenshot);
    }

    return () => {
      clearInterval(interval);
      realtimeSocket?.disconnect();
    };
  }, [session, open]);

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `captura-${session?.qrName}-${Date.now()}.jpg`;
    link.target = '_blank';
    link.click();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatIntervalText = (seconds: number) => {
    if (seconds === 60) return '1 minuto';
    if (seconds > 60 && seconds % 60 === 0) return `${seconds / 60} minutos`;
    return `${seconds} segundos`;
  };

  const activeCaptureModes = [
    captureConfig.captureScreen ? `pantalla cada ${formatIntervalText(captureConfig.screenInterval)}` : null,
    captureConfig.captureCamera ? `cámara cada ${formatIntervalText(captureConfig.cameraInterval)}` : null,
  ].filter(Boolean);

  const handleNextImage = () => {
    if (selectedIndex < screenshots.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedImage(screenshots[newIndex].url);
    }
  };

  const handlePrevImage = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedImage(screenshots[newIndex].url);
    }
  };

  const saveConfiguration = async () => {
    if (isSavingConfig) return;

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!BACKEND_URL || !session?.qrId || isMobileAppSession) {
      toast({
        title: 'No se pudo guardar',
        description: isMobileAppSession
          ? 'Las sesiones móviles directas no usan configuración de QR.'
          : 'Falta configuración (BACKEND_URL) o QR ID.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSavingConfig(true);
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/qr/${session.qrId}/screenshot-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(captureConfig),
      });

      if (!res.ok) {
        const rawMessage = await readErrorMessage(res);
        const normalized = typeof rawMessage === 'string' ? rawMessage.trim() : '';
        if (res.status === 404 && normalized.includes('QR not found')) {
          throw new Error(
            `El backend no encontró este QR (${session.qrId}). ` +
              'Suele pasar si Redis se reinició o si el Admin apunta a otro BACKEND_URL.'
          );
        }
        throw new Error(normalized || `Error guardando configuración (HTTP ${res.status})`);
      }

      toast({
        title: 'Configuración guardada',
        description: 'Se aplicará en las próximas capturas.',
      });
      setShowConfig(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración.';
      console.error('Error guardando configuración:', error);
      toast({
        title: 'Error al guardar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const deleteScreenshot = async (screenshotId: string) => {
    if (!confirm('¿Eliminar esta captura?')) return;

    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
      }
      
      const response = await fetch(
        `${BACKEND_URL}/screenshots/${screenshotId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        console.log('✅ Captura eliminada');
        loadScreenshots();
      }
    } catch (error) {
      console.error('❌ Error eliminando captura:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSelectedScreenshots = async () => {
    if (selectedScreenshots.size === 0) {
      alert('Selecciona al menos una captura');
      return;
    }

    if (!confirm(`¿Eliminar ${selectedScreenshots.size} capturas seleccionadas?`)) return;

    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
      }
      
      const response = await fetch(
        `${BACKEND_URL}/screenshots/batch/multiple`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: Array.from(selectedScreenshots) }),
        }
      );

      if (response.ok) {
        console.log('✅ Capturas eliminadas');
        setSelectedScreenshots(new Set());
        loadScreenshots();
      }
    } catch (error) {
      console.error('❌ Error eliminando capturas:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllScreenshots = async () => {
    if (!session?.sessionId) return;
    if (!confirm('¿Eliminar TODAS las capturas de esta sesión?')) return;

    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('token');
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!BACKEND_URL) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL no configurado');
      }
      
      const response = await fetch(
        `${BACKEND_URL}/screenshots/session/${session.sessionId}/all`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        console.log('✅ Todas las capturas eliminadas');
        setSelectedScreenshots(new Set());
        loadScreenshots();
      }
    } catch (error) {
      console.error('❌ Error eliminando capturas:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleScreenshotSelection = (screenshotId: string) => {
    const newSelection = new Set(selectedScreenshots);
    if (newSelection.has(screenshotId)) {
      newSelection.delete(screenshotId);
    } else {
      newSelection.add(screenshotId);
    }
    setSelectedScreenshots(newSelection);
  };

  const selectAllScreenshots = () => {
    if (selectedScreenshots.size === screenshots.length) {
      setSelectedScreenshots(new Set());
    } else {
      setSelectedScreenshots(new Set(screenshots.map((s: any) => s.id)));
    }
  };

  if (!session) return null;

  const hasScreenPermission = session.permissions?.screen;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-[min(1500px,96vw)] flex-col overflow-y-auto lg:h-[92dvh] lg:max-h-[92dvh] lg:overflow-hidden bg-background border border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3 pr-6">
              <Camera className="w-6 h-6 text-foreground" />
              <span>Galería de Capturas Automáticas</span>
              {selectedScreenshots.size > 0 && (
                <Badge className="border border-border bg-muted/40 text-foreground/80">
                  {selectedScreenshots.size} seleccionadas
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedScreenshots.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteSelectedScreenshots}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2 text-foreground" />
                  Eliminar ({selectedScreenshots.size})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={deleteAllScreenshots}
                disabled={isDeleting || screenshots.length === 0}
                className="border-border bg-card text-foreground hover:bg-muted"
              >
                <Trash2 className="w-4 h-4 mr-2 text-foreground" />
                Eliminar Todas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfig(!showConfig)}
                className="border-border bg-card text-foreground hover:bg-muted"
              >
                <Settings className="w-4 h-4 mr-2 text-foreground" />
                Configurar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadScreenshots}
                disabled={isLoading}
                className="border-border bg-card text-foreground hover:bg-muted"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-foreground" />
                )}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Consulta, descarga, configura o elimina capturas automáticas de cámara y pantalla.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs border-border bg-muted/40 text-foreground/80">
              {session.qrName}
            </Badge>
            <Badge className="text-xs border border-border bg-muted/40 text-foreground/80">
              {screenshots.length} capturas
            </Badge>
            {captureConfig.captureScreen && (
              <Badge variant="outline" className="text-xs border-border bg-muted/40 text-foreground/80">
                <Monitor className="w-3 h-3 mr-1 text-foreground" />
                Pantalla: {captureConfig.screenInterval}s
              </Badge>
            )}
            {captureConfig.captureCamera && (
              <Badge variant="outline" className="text-xs border-border bg-muted/40 text-foreground/80">
                <Video className="w-3 h-3 mr-1 text-foreground" />
                Cámara: {captureConfig.cameraInterval}s
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Panel de Configuración */}
        {showConfig && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-4 text-foreground">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-foreground" />
              Configuración de Capturas Automáticas
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Captura de Pantalla */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={captureConfig.captureScreen}
                    onChange={(e) =>
                      setCaptureConfig({
                        ...captureConfig,
                        captureScreen: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border border-border bg-card accent-blue-500"
                  />
                  <Monitor className="w-4 h-4 text-foreground" />
                  <span className="text-sm font-medium">Capturar Pantalla</span>
                    <Badge
                      variant="outline"
                      className={
                        captureConfig.captureScreen
                          ? 'ml-auto text-[11px] border-blue-500/40 bg-blue-500/10 text-blue-700'
                          : 'ml-auto text-[11px] border-border bg-muted/40 text-foreground/60'
                      }
                    >
                      {captureConfig.captureScreen ? 'Activa' : 'Inactiva'}
                    </Badge>
                </label>
                
                {captureConfig.captureScreen && (
                  <div>
                    <label className="text-xs text-foreground/60 block mb-1">
                      Intervalo (segundos)
                    </label>
                    <Select
                      value={String(captureConfig.screenInterval)}
                      onValueChange={(value) =>
                        setCaptureConfig({
                          ...captureConfig,
                          screenInterval: parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full border-border bg-card/40 text-foreground focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40">
                        <SelectValue placeholder="Selecciona intervalo" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-foreground">
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="5">5 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="10">10 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="15">15 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="30">30 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="60">1 minuto</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="120">2 minutos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="300">5 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Captura de Cámara */}
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={captureConfig.captureCamera}
                    onChange={(e) =>
                      setCaptureConfig({
                        ...captureConfig,
                        captureCamera: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border border-border bg-card accent-blue-500"
                  />
                  <Video className="w-4 h-4 text-foreground" />
                  <span className="text-sm font-medium">Capturar Cámara</span>
                    <Badge
                      variant="outline"
                      className={
                        captureConfig.captureCamera
                          ? 'ml-auto text-[11px] border-blue-500/40 bg-blue-500/10 text-blue-700'
                          : 'ml-auto text-[11px] border-border bg-muted/40 text-foreground/60'
                      }
                    >
                      {captureConfig.captureCamera ? 'Activa' : 'Inactiva'}
                    </Badge>
                </label>
                
                {captureConfig.captureCamera && (
                  <div>
                    <label className="text-xs text-foreground/60 block mb-1">
                      Intervalo (segundos)
                    </label>
                    <Select
                      value={String(captureConfig.cameraInterval)}
                      onValueChange={(value) =>
                        setCaptureConfig({
                          ...captureConfig,
                          cameraInterval: parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full border-border bg-card/40 text-foreground focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40">
                        <SelectValue placeholder="Selecciona intervalo" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-foreground">
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="10">10 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="15">15 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="30">30 segundos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="60">1 minuto</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="120">2 minutos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="300">5 minutos</SelectItem>
                        <SelectItem className="focus:bg-muted focus:text-foreground" value="600">10 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfig(false)}
                className="border-border bg-card text-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveConfiguration}
                disabled={isSavingConfig}
                className="bg-blue-600/90 hover:bg-blue-600 text-foreground"
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

        <div className="flex shrink-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:shrink lg:overflow-hidden">
          {/* Mostrar advertencia solo si NO hay capturas y el permiso es false */}
          {!hasScreenPermission && screenshots.length === 0 && !isLoading && (
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-700 ml-2">
                <strong>Pantalla no compartida.</strong> El usuario decidió no compartir su pantalla. 
                No se están capturando screenshots automáticos.
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading */}
          {isLoading && screenshots.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-foreground/40" />
                <p className="text-sm text-foreground/60">Cargando capturas...</p>
              </div>
            </div>
          )}

          {/* Sin capturas - mostrar mensaje genérico sin verificar permisos */}
          {!isLoading && screenshots.length === 0 && !error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <ImageIcon className="w-20 h-20 mx-auto text-foreground/20" />
                <div>
                  <p className="text-base font-medium text-foreground mb-2">
                    No hay capturas disponibles
                  </p>
                  <p className="text-sm text-foreground/60 max-w-md mx-auto">
                    Las capturas aparecerán aquí cuando el sistema las tome automáticamente.
                    {activeCaptureModes.length > 0 && ` El sistema está capturando ${activeCaptureModes.join(' y ')}.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Galería */}
          {screenshots.length > 0 && (
            <div className="grid shrink-0 grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:shrink lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
              {/* Imagen principal */}
              <div className="min-h-0 flex flex-col gap-2">
                <div className="aspect-video min-h-[220px] bg-card lg:aspect-auto lg:min-h-[360px] lg:flex-1 border border-border rounded-lg overflow-hidden relative group">
                  {selectedImage ? (
                    <>
                      <img
                        src={selectedImage}
                        alt="Captura seleccionada"
                        className="w-full h-full object-contain"
                      />
                      
                      {/* Botones de navegación */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute left-4 top-1/2 -translate-y-1/2 border border-primary/15 bg-black/70 text-primary-foreground opacity-100 transition-opacity hover:bg-muted focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        onClick={handlePrevImage}
                        disabled={selectedIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 text-primary-foreground" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute right-4 top-1/2 -translate-y-1/2 border border-primary/15 bg-black/70 text-primary-foreground opacity-100 transition-opacity hover:bg-muted focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        onClick={handleNextImage}
                        disabled={selectedIndex === screenshots.length - 1}
                      >
                        <ChevronRight className="w-4 h-4 text-primary-foreground" />
                      </Button>
                      
                      {/* Contador de imágenes */}
                      <div className="absolute top-4 left-4 bg-black/70 text-primary-foreground text-sm px-3 py-1.5 rounded-lg">
                        {selectedIndex + 1} / {screenshots.length}
                      </div>

                      {screenshots[selectedIndex]?.type && (
                        <div className="absolute top-4 right-4">
                          <Badge
                            variant="outline"
                            className="text-xs border-border bg-card/70 text-foreground/80 backdrop-blur"
                          >
                            {screenshots[selectedIndex].type === 'camera' ? (
                              <>
                                <Video className="w-3 h-3 mr-1 text-emerald-700" />
                                Cámara
                              </>
                            ) : (
                              <>
                                <Monitor className="w-3 h-3 mr-1 text-foreground" />
                                Pantalla
                              </>
                            )}
                          </Badge>
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        className="absolute bottom-4 right-4 border border-blue-400/30 bg-blue-600 text-primary-foreground shadow-sm shadow-blue-950/40 hover:bg-blue-500"
                        onClick={() => handleDownload(selectedImage)}
                      >
                        <Download className="w-4 h-4 mr-2 text-foreground" />
                        Descargar
                      </Button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/60">
                      Selecciona una captura
                    </div>
                  )}
                </div>
                
                {/* Info de la captura seleccionada */}
                {selectedImage && (
                  <div className="flex flex-wrap items-center gap-2 px-2 text-sm text-foreground/60 sm:gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-foreground" />
                      {formatTime(
                        screenshots.find((s) => s.url === selectedImage)
                          ?.capturedAt || ''
                      )}
                    </span>
                    <span>•</span>
                    <span>{session.ip}</span>
                    <span>•</span>
                    <span>{session.deviceInfo?.browser || 'Desconocido'}</span>
                  </div>
                )}
              </div>

              {/* Miniaturas (1/3) */}
              <div className="qr-dialog-scroll max-h-72 min-h-0 space-y-2 overflow-y-auto pr-3 lg:max-h-none">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground/60">
                    Timeline de Capturas
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={selectAllScreenshots}
                    className="h-6 text-xs text-foreground/70 hover:text-foreground hover:bg-muted/60"
                  >
                    {selectedScreenshots.size === screenshots.length ? 'Deseleccionar' : 'Seleccionar'} Todas
                  </Button>
                </div>
                {screenshots.map((screenshot, index) => (
                  <div
                    key={screenshot.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => {
                        setSelectedImage(screenshot.url);
                        setSelectedIndex(index);
                      }}
                      className={`w-full relative rounded-lg overflow-hidden border-2 transition-all ${
                        selectedIndex === index
                          ? 'border-blue-500/60 ring-1 ring-blue-500/15'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <img
                        src={screenshot.thumbnailUrl}
                        alt={`Captura ${screenshot.id}`}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-primary-foreground text-xs p-1.5 flex items-center justify-center gap-1">
                        {screenshot.type === 'camera' ? (
                          <Video className="w-3 h-3 text-foreground" />
                        ) : (
                          <Monitor className="w-3 h-3 text-foreground" />
                        )}
                        <Clock className="w-3 h-3 text-foreground" />
                        {formatTime(screenshot.capturedAt)}
                      </div>
                    </button>
                    
                    {/* Checkbox de selección */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedScreenshots.has(screenshot.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleScreenshotSelection(screenshot.id);
                        }}
                        className="h-4 w-4 rounded border border-border bg-card/80 accent-blue-500 shadow cursor-pointer"
                      />
                    </div>
                    
                    {/* Botón eliminar individual */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScreenshot(screenshot.id);
                      }}
                      disabled={isDeleting}
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info técnica */}
          {showSystemNotice && (
            <Alert className="relative border-border bg-card pr-11">
              <Camera className="h-4 w-4 text-foreground" />
              <AlertDescription className="text-foreground/75 text-xs ml-2">
                <strong className="text-foreground">Sistema automático:</strong> Las capturas se toman desde el
                stream del usuario ({activeCaptureModes.join(' y ') || 'captura desactivada'}). Se almacenan en el volumen privado del screen-recorder y siguen la política
                de retención configurada por razones de privacidad.
              </AlertDescription>
              <button
                type="button"
                onClick={() => setShowSystemNotice(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/70 transition hover:bg-muted hover:text-foreground"
                aria-label="Cerrar aviso del sistema automático"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

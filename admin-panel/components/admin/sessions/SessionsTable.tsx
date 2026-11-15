'use client';

import { Eye, XCircle, Globe, Monitor, MapPin, Video, Smartphone, Laptop, Tablet, Camera, Mic, Navigation, ScreenShare, AlertCircle, Send, Volume2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SessionRiskBadge } from '@/components/SessionRiskBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import type { ActiveSession } from '@/lib/admin-api';

interface SessionsTableProps {
  sessions: ActiveSession[];
  onKill: (sessionId: string) => void;
  onView: (sessionId: string) => void;
  onViewScreen?: (sessionId: string) => void;
  onViewAudio?: (sessionId: string) => void;
  onViewLive?: (sessionId: string) => void;
  onSendNotification?: (sessionId: string) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function SessionsTable({ sessions, onKill, onView, onViewScreen, onViewAudio, onViewLive, onSendNotification, emptyMessage, emptyDescription }: SessionsTableProps) {
  const router = useRouter();

  const actionIconClass = "text-foreground/70 hover:text-foreground hover:bg-muted/60";
  const isMobileAppSession = (session: ActiveSession) => session.source === 'mobile-app' || session.qrId?.startsWith('mobile-direct:');

  const getSessionTitle = (session: ActiveSession) => {
    if (isMobileAppSession(session)) {
      return session.mobile?.deviceLabel || session.qrName || 'Kids4Safe Mobile';
    }

    return session.qrName || 'QR Session';
  };

  const getDeviceType = (session: ActiveSession) => {
    const platform = `${session.deviceInfo?.platform || ''} ${session.deviceInfo?.os || ''}`.toLowerCase();
    if (platform.includes('win32') || platform.includes('windows')) return 'desktop';
    if (platform.includes('mac') || platform.includes('linux')) return 'desktop';
    return session.deviceInfo?.deviceType || session.deviceInfo?.platform || (isMobileAppSession(session) ? 'mobile' : undefined);
  };

  const getMobilePlatform = (session: ActiveSession) =>
    (session.mobile?.platform || session.deviceInfo?.platform || session.deviceInfo?.os || '').toLowerCase();

  const getMobileRuntimeBadge = (session: ActiveSession) => {
    if (!isMobileAppSession(session)) return null;

    const platform = getMobilePlatform(session);
    if (platform.includes('android')) {
      return <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">Android nativo</Badge>;
    }
    if (platform.includes('ios')) {
      return <Badge className="bg-sky-500/10 text-sky-200 border border-sky-500/30">iOS nativo</Badge>;
    }
    if (platform.includes('web')) {
      return <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/30">Web Railway</Badge>;
    }

    return <Badge className="bg-zinc-500/10 text-muted-foreground border border-border/30">Runtime movil</Badge>;
  };

  const getMobileAppStateBadge = (session: ActiveSession) => {
    if (!isMobileAppSession(session)) return null;

    const appState = session.mobile?.appState || 'unknown';
    if (appState === 'active') {
      return <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">Foreground</Badge>;
    }
    if (appState === 'background') {
      return <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/30">Background</Badge>;
    }
    if (appState === 'inactive') {
      return <Badge className="bg-zinc-500/10 text-muted-foreground border border-border/30">Inactiva</Badge>;
    }

    return <Badge className="bg-zinc-500/10 text-muted-foreground border border-border/30">Sin estado</Badge>;
  };

  const getSessionDuration = (session: ActiveSession) => {
    const startTimeRaw = (session as any).createdAt || session.startedAt;
    if (!startTimeRaw) return 'N/A';
    
    // Convertir string ISO o Date object a timestamp numérico
    const startTime = typeof startTimeRaw === 'string' 
      ? new Date(startTimeRaw).getTime()
      : typeof startTimeRaw === 'number'
      ? startTimeRaw
      : new Date(startTimeRaw).getTime();
    
    if (isNaN(startTime)) return 'N/A';
    
    const duration = Date.now() - startTime;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return '< 1m';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Activa</Badge>;
      case 'streaming':
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Streaming</Badge>;
      case 'paused':
        return (
          <Badge className="border border-border bg-muted/40 text-foreground/75">
            Pausada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border text-foreground/75">
            {status}
          </Badge>
        );
    }
  };

  const getDeviceTypeBadge = (deviceType?: string, os?: string) => {
    const type = deviceType?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Normalizar y remover acentos
    const isAndroid = os?.toLowerCase().includes('android');
    const isIOS = os?.toLowerCase().includes('ios');
    
    if (type === 'mobile' || type === 'movil') {
      return (
        <Badge variant="outline" className="text-xs border-border text-foreground/85">
          <Smartphone className="mr-1 h-3 w-3" />
          {isAndroid ? 'Android' : isIOS ? 'iOS' : 'Móvil'}
        </Badge>
      );
    }
    if (type === 'tablet') {
      return (
        <Badge variant="outline" className="text-xs border-border text-foreground/85">
          <Tablet className="mr-1 h-3 w-3" />
          {isAndroid ? 'Android Tablet' : isIOS ? 'iPad' : 'Tablet'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs border-border text-foreground/85">
        <Laptop className="mr-1 h-3 w-3" />
        Desktop
      </Badge>
    );
  };

  const getPermissionIcons = (permissions: ActiveSession['permissions']) => {
    // 🔒 FIX: Validar que permissions existe
    if (!permissions) return [];
    
    const icons = [];
    if (permissions.camera) icons.push({ Icon: Camera, label: 'Cámara' });
    if (permissions.microphone) icons.push({ Icon: Mic, label: 'Micrófono' });
    if (permissions.location) icons.push({ Icon: Navigation, label: 'Ubicación' });
    if (permissions.screen) icons.push({ Icon: ScreenShare, label: 'Pantalla' });
    return icons;
  };

  const getCapabilitiesInfo = (session: ActiveSession) => {
    const caps = session.deviceCapabilities;
    if (!caps) return null;

    const available = [];
    const unavailable = [];

    // Cámara
    if (caps.camera?.available) {
      const modes = caps.camera.modes.join('/');
      available.push({ Icon: Camera, label: `Cámara ${modes}`, color: 'text-green-600' });
    } else {
      unavailable.push({ Icon: Camera, label: 'Cámara', color: 'text-muted-foreground' });
    }

    // Micrófono
    if (caps.microphone?.available) {
      available.push({ Icon: Mic, label: 'Micrófono', color: 'text-green-600' });
    } else {
      unavailable.push({ Icon: Mic, label: 'Micrófono', color: 'text-muted-foreground' });
    }

    // GPS
    if (caps.location?.gpsAvailable) {
      available.push({ Icon: Navigation, label: 'GPS', color: 'text-green-600' });
    } else if (caps.location?.available) {
      available.push({ Icon: MapPin, label: 'Ubicación IP', color: 'text-yellow-600' });
    }

    // Pantalla
    if (caps.screen?.canCapture) {
      available.push({ Icon: ScreenShare, label: 'Pantalla', color: 'text-green-600' });
    } else {
      unavailable.push({ Icon: ScreenShare, label: 'Pantalla', color: 'text-muted-foreground' });
    }

    return { available, unavailable };
  };

  if (sessions.length === 0) {
    return (
      <div className="border border-dashed rounded-lg py-12 text-center">
        <Globe className="h-12 w-12 mx-auto mb-4 text-foreground opacity-30" />
        <p className="text-foreground/70">{emptyMessage || 'No hay sesiones activas'}</p>
        <p className="text-sm text-foreground/50 mt-2">
          {emptyDescription || 'Las sesiones aparecerán aquí cuando alguien escanee un QR'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground/60">Origen</TableHead>
              <TableHead className="hidden lg:table-cell text-foreground/60">IP</TableHead>
              <TableHead className="hidden xl:table-cell text-foreground/60">Dispositivo</TableHead>
              <TableHead className="hidden 2xl:table-cell text-foreground/60">Capacidades</TableHead>
              <TableHead className="text-foreground/60">Estado</TableHead>
              <TableHead className="hidden lg:table-cell text-foreground/60">Duración</TableHead>
              <TableHead className="text-foreground/60">Permisos</TableHead>
              <TableHead className="text-right text-foreground/60">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sessions.map((session) => {
              const permissionIcons = getPermissionIcons(session.permissions);
              const capabilities = getCapabilitiesInfo(session);
              const isLiveActionEnabled = session.status === 'active';
              
              return (
                <TableRow key={session.sessionId} className="text-foreground/80">
                  {/* QR Name */}
                  <TableCell>
                    {isMobileAppSession(session) ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/30">
                            <Smartphone className="mr-1 h-3 w-3" />
                            App móvil
                          </Badge>
                          {session.mobile?.bluetooth?.connected && (
                            <Badge className="bg-blue-500/10 text-blue-700 border border-blue-500/30">
                              Pulsera vinculada
                            </Badge>
                          )}
                          {getMobileRuntimeBadge(session)}
                          {getMobileAppStateBadge(session)}
                        </div>
                        <p className="font-medium text-sm text-foreground">
                          {getSessionTitle(session)}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push(`/dashboard/qrs/${session.qrId}`)}
                        className="font-medium text-sm text-foreground hover:underline text-left"
                      >
                        {getSessionTitle(session)}
                      </button>
                    )}
                    <p className="text-xs text-foreground/45 font-mono">
                      {isMobileAppSession(session) ? session.mobile?.unitId || session.qrId : session.qrId}
                    </p>
                    {!isMobileAppSession(session) && session.subject?.displayName && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-foreground/75">
                        <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                          {session.subject.photoThumbnailUrl || session.subject.photoUrl ? (
                            <img
                              src={session.subject.photoThumbnailUrl || session.subject.photoUrl}
                              alt={session.subject.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound className="h-3.5 w-3.5 text-foreground/45" />
                          )}
                        </div>
                        <span className="max-w-[180px] truncate">{session.subject.displayName}</span>
                      </div>
                    )}
                    {isMobileAppSession(session) && session.mobile?.platform && (
                      <p className="text-xs text-foreground/55">
                        {session.mobile.platform}{session.mobile.appVersion ? ` · v${session.mobile.appVersion}` : ''}
                        {getMobilePlatform(session).includes('web') ? ' · permisos limitados por navegador' : ''}
                      </p>
                    )}
                  </TableCell>

                  {/* IP */}
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-mono text-xs text-foreground/85">
                      {(session as any).ipAddress || session.ip || 'N/A'}
                    </span>
                    {((session as any).location?.country || (session as any).country) && (
                      <p className="text-xs text-foreground/55">
                        {(session as any).location?.country || (session as any).country}
                      </p>
                    )}
                  </TableCell>

                  {/* Device Type */}
                  <TableCell className="hidden xl:table-cell">
                    <div className="space-y-1">
                      {getDeviceTypeBadge(getDeviceType(session), session.deviceInfo?.os)}
                      <p className="text-xs text-foreground/70">
                        {isMobileAppSession(session) ? session.mobile?.activationMode || 'direct' : session.deviceInfo?.browser || 'Desconocido'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Capabilities */}
                  <TableCell className="hidden 2xl:table-cell">
                    {capabilities ? (
                      <div className="space-y-1">
                        {/* Disponibles */}
                        <div className="flex gap-1 flex-wrap">
                          {capabilities.available.map(({ Icon, label, color }, idx) => (
                            <div key={idx} title={`✓ ${label}`} className={`${color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                          ))}
                        </div>
                        {/* No disponibles */}
                        {capabilities.unavailable.length > 0 && (
                          <div className="flex gap-1 flex-wrap opacity-50">
                            {capabilities.unavailable.map(({ Icon, label }, idx) => (
                              <div key={idx} title={`✗ ${label} (no disponible)`} className="text-muted-foreground">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground/45">N/A</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {getStatusBadge(session.status)}
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="hidden lg:table-cell text-sm">
                    <span className="text-foreground/85">{getSessionDuration(session)}</span>
                  </TableCell>

                  {/* Permissions */}
                  <TableCell>
                    <div className="flex gap-1">
                      {permissionIcons.slice(0, 3).map(({ Icon, label }, idx) => (
                        <div key={idx} title={label}>
                          <Icon className="h-4 w-4 text-foreground/55" />
                        </div>
                      ))}
                      {permissionIcons.length > 3 && (
                        <span className="text-xs text-foreground/50">
                          +{permissionIcons.length - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onView(session.sessionId)}
                        title="Ver detalles"
                        className={actionIconClass}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {onViewLive && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onViewLive(session.sessionId)}
                          disabled={!isLiveActionEnabled}
                          title={isLiveActionEnabled ? 'Ver en vivo (WebRTC)' : 'Solo disponible en sesiones activas'}
                          className="text-red-400 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      )}

                      {onSendNotification && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onSendNotification(session.sessionId)}
                          title="Enviar notificación push"
                          className="text-blue-400 hover:text-blue-700 hover:bg-blue-500/10"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}

                      {onViewScreen && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onViewScreen(session.sessionId)}
                          title="Ver capturas guardadas"
                          className={actionIconClass}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                      )}

                      {onViewAudio && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onViewAudio(session.sessionId)}
                          title="Ver clips de audio guardados"
                          className={actionIconClass}
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="destructive">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border text-foreground">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">¿Terminar y eliminar sesión?</AlertDialogTitle>
                            <AlertDialogDescription className="text-foreground opacity-70">
                              Esta acción cierra la conexión del usuario y elimina la sesión junto con capturas, audio y tracking guardado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onKill(session.sessionId)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Terminar y eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-4">
        {sessions.map((session) => {
          const permissionIcons = getPermissionIcons(session.permissions);
          const capabilities = getCapabilitiesInfo(session);
          const isLiveActionEnabled = session.status === 'active';
          
          return (
            <div key={session.sessionId} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  {isMobileAppSession(session) ? (
                    <div className="space-y-1">
                      <Badge className="bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/30">
                        <Smartphone className="mr-1 h-3 w-3" />
                        App móvil
                      </Badge>
                      {getMobileRuntimeBadge(session)}
                      <p className="font-medium text-sm">{getSessionTitle(session)}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/dashboard/qrs/${session.qrId}`)}
                      className="font-medium text-sm hover:underline"
                    >
                      {getSessionTitle(session)}
                    </button>
                  )}
                  <p className="text-xs text-foreground/45 font-mono">
                    {isMobileAppSession(session)
                      ? session.mobile?.unitId || session.qrId
                      : session.sessionId
                        ? `${session.sessionId.substring(0, 16)}...`
                        : '—'}
                  </p>
                  {!isMobileAppSession(session) && session.subject?.displayName && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-foreground/75">
                      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                        {session.subject.photoThumbnailUrl || session.subject.photoUrl ? (
                          <img
                            src={session.subject.photoThumbnailUrl || session.subject.photoUrl}
                            alt={session.subject.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-4 w-4 text-foreground/45" />
                        )}
                      </div>
                      <span className="truncate">{session.subject.displayName}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(session.status)}
                  {getDeviceTypeBadge(getDeviceType(session), session.deviceInfo?.os)}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/55">IP:</span>
                  <span className="font-mono text-xs text-foreground/80">
                    {(session as any).ipAddress || session.ip || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/55">Duración:</span>
                  <span className="text-foreground/80">{getSessionDuration(session)}</span>
                </div>
                {session.deviceInfo?.browser && (
                  <div className="flex justify-between">
                    <span className="text-foreground/55">Navegador:</span>
                    <span className="text-foreground/80">{session.deviceInfo.browser}</span>
                  </div>
                )}
                {isMobileAppSession(session) && session.mobile?.bluetooth && (
                  <div className="flex justify-between">
                    <span className="text-foreground/55">Bluetooth:</span>
                    <span className="text-foreground/80">
                      {session.mobile.bluetooth.connected ? session.mobile.bluetooth.deviceName || 'Vinculado' : 'No vinculado'}
                    </span>
                  </div>
                )}
              </div>

              {/* Capacidades del dispositivo */}
              {capabilities && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-medium text-foreground/55">Capacidades del Dispositivo:</p>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.available.map(({ Icon, label, color }, idx) => (
                      <Badge key={idx} variant="outline" className={`text-xs border-border ${color}`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {label}
                      </Badge>
                    ))}
                    {capabilities.unavailable.map(({ Icon, label }, idx) => (
                      <Badge
                        key={`unavail-${idx}`}
                        variant="outline"
                        className="text-xs border-border text-foreground/55 opacity-50 line-through"
                      >
                        <Icon className="mr-1 h-3 w-3" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              <div className="flex gap-2 pt-2 border-t">
                {permissionIcons.map(({ Icon, label }, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-border text-foreground/75"
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {label}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onView(session.sessionId)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>

                {onViewLive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-700 border-red-500/30 hover:bg-red-500/10 hover:text-red-700"
                    disabled={!isLiveActionEnabled}
                    onClick={() => onViewLive(session.sessionId)}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    En vivo
                  </Button>
                )}

                {onViewScreen && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onViewScreen(session.sessionId)}
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    Capturas
                  </Button>
                )}

                {onViewAudio && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onViewAudio(session.sessionId)}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Audio
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="flex-1">
                      <XCircle className="mr-2 h-4 w-4" />
                      Terminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border text-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">¿Terminar y eliminar sesión?</AlertDialogTitle>
                      <AlertDialogDescription className="text-foreground opacity-70">
                        Esta acción cierra la conexión del usuario y elimina la sesión junto con capturas, audio y tracking guardado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onKill(session.sessionId)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Terminar y eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

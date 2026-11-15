'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionPermissionCards } from '@/components/sessions/SessionPermissionCards';
import { SessionNetworkPanel } from '@/components/sessions/SessionNetworkPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ForensicTimeline } from '@/components/ForensicTimeline';
import { ExportPDFButton } from '@/components/sessions/ExportPDFButton';
import { CorrelatedSessionsCard } from '@/components/sessions/CorrelatedSessionsCard';
import { LocationHistoryTab } from '@/components/sessions/LocationHistoryTab';
import { 
  Camera, 
  Mic, 
  Monitor, 
  MapPin, 
  Globe, 
  Smartphone, 
  Clock, 
  Activity,
  ImagePlus,
  Loader2,
  Save,
  Video,
  UserRound
} from 'lucide-react';
import { AdminAPI, type ActiveSession, type MobileAppProfile, type QrLinkSubject } from '@/lib/admin-api';
import { useEffect, useState } from 'react';

interface SessionDetailModalProps {
  session: ActiveSession | null;
  open: boolean;
  onViewAudio?: (sessionId: string) => void;
  onViewLive?: (sessionId: string) => void;
  onViewRecordings?: (sessionId: string) => void;
  onViewScreen?: (sessionId: string) => void;
  onClose: () => void;
}

function getLocationCoordinates(location: any): { latitude: number; longitude: number } | null {
  if (!location) return null;

  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

type MobileProfileSnapshot = NonNullable<ActiveSession['mobile']>['profile'];

function hasMobileProfileInfo(profile?: MobileAppProfile | MobileProfileSnapshot | null) {
  return Boolean(
    profile?.fullName ||
    profile?.phone ||
    profile?.emergencyContact?.name ||
    profile?.emergencyContact?.phone ||
    profile?.bloodType ||
    profile?.avatarThumbnailUrl ||
    profile?.avatarUri,
  );
}

export function SessionDetailModal({ session, open, onClose, onViewAudio, onViewLive, onViewRecordings, onViewScreen }: SessionDetailModalProps) {
  const [duration, setDuration] = useState('');
  const [subject, setSubject] = useState<QrLinkSubject | null>(null);
  const [mobileProfile, setMobileProfile] = useState<MobileAppProfile | null>(null);
  const [mobileProfileLoading, setMobileProfileLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectMessage, setSubjectMessage] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [subjectForm, setSubjectForm] = useState({
    displayName: '',
    phone: '',
    email: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (!session) return;
    
    const updateDuration = () => {
      // Usar startedAt primero, luego createdAt como fallback
      const startTimeRaw = session.startedAt || (session as any).createdAt;
      
      if (!startTimeRaw) {
        setDuration('N/A');
        return;
      }
      
      // Convertir a timestamp numérico si es string ISO o Date object
      const startTime = typeof startTimeRaw === 'string' 
        ? new Date(startTimeRaw).getTime()
        : typeof startTimeRaw === 'number'
        ? startTimeRaw
        : new Date(startTimeRaw).getTime();
      
      const diff = Date.now() - startTime;
      
      // Validar que el diff sea positivo y razonable
      if (diff < 0 || isNaN(diff)) {
        setDuration('N/A');
        return;
      }
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setDuration(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const isMobileAppSession = Boolean(
    session && (session.source === 'mobile-app' || session.qrId?.startsWith('mobile-direct:')),
  );
  const mobileUnitId = isMobileAppSession
    ? session?.mobile?.unitId || session?.qrId?.replace(/^mobile-direct:/, '')
    : undefined;
  const sessionMobileProfile = session?.mobile?.profile || null;
  const displayMobileProfile = hasMobileProfileInfo(mobileProfile) ? mobileProfile : sessionMobileProfile;

  useEffect(() => {
    if (!open || !session || isMobileAppSession) {
      setSubject(null);
      setSubjectMessage('');
      setAvatarDataUrl(undefined);
      return;
    }

    let cancelled = false;
    setSubjectLoading(true);
    setSubjectMessage('');

    AdminAPI.getSessionSubject(session.sessionId)
      .then(({ subject: loadedSubject }) => {
        if (cancelled) return;
        setSubject(loadedSubject);
        setSubjectForm({
          displayName: loadedSubject?.displayName || session.subject?.displayName || '',
          phone: loadedSubject?.phone || '',
          email: loadedSubject?.email || '',
          notes: loadedSubject?.notes || '',
          tags: loadedSubject?.tags?.join(', ') || '',
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setSubjectMessage(error instanceof Error ? error.message : 'No se pudo cargar la identidad');
      })
      .finally(() => {
        if (!cancelled) setSubjectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, session?.sessionId, isMobileAppSession]);

  useEffect(() => {
    if (!open || !session || !isMobileAppSession || !mobileUnitId) {
      setMobileProfile(null);
      return;
    }

    let cancelled = false;
    setMobileProfileLoading(true);

    AdminAPI.getMobileAppProfile(mobileUnitId)
      .then((profile) => {
        if (!cancelled) setMobileProfile(profile);
      })
      .catch(() => {
        if (!cancelled) setMobileProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMobileProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, session?.sessionId, isMobileAppSession, mobileUnitId]);

  const handleSubjectAvatar = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveSubject = async () => {
    if (!session || isMobileAppSession) return;
    if (!subjectForm.displayName.trim()) {
      setSubjectMessage('El nombre es obligatorio');
      return;
    }

    setSubjectSaving(true);
    setSubjectMessage('');

    try {
      const response = await AdminAPI.upsertSessionSubject(session.sessionId, {
        subjectId: subject?._id || subject?.id || session.subject?.subjectId,
        displayName: subjectForm.displayName,
        phone: subjectForm.phone,
        email: subjectForm.email,
        notes: subjectForm.notes,
        tags: subjectForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        avatarDataUrl,
      });

      setSubject(response.subject);
      setAvatarDataUrl(undefined);
      setSubjectMessage('Identidad guardada');
    } catch (error) {
      setSubjectMessage(error instanceof Error ? error.message : 'No se pudo guardar la identidad');
    } finally {
      setSubjectSaving(false);
    }
  };

  if (!session) return null;

  const platformForDeviceType = `${session.deviceInfo?.platform || ''} ${session.deviceInfo?.os || ''}`.toLowerCase();
  const displayDeviceType: string = isMobileAppSession
    ? 'Mobile App'
    : platformForDeviceType.includes('win32') || platformForDeviceType.includes('windows') || platformForDeviceType.includes('mac') || platformForDeviceType.includes('linux')
      ? 'desktop'
      : session.deviceInfo?.deviceType || 'desktop';
  const displayDeviceTypeLabel =
    displayDeviceType === 'desktop' || displayDeviceType === 'laptop'
      ? 'Desktop/Laptop'
      : displayDeviceType === 'mobile'
        ? 'Movil'
        : displayDeviceType;
  const displayPlatform = isMobileAppSession
    ? session.mobile?.platform || session.deviceInfo?.platform || session.deviceInfo?.os || 'App movil'
    : session.deviceInfo?.platform || session.deviceInfo?.os || 'Desconocido';
  const displayBrowser = isMobileAppSession ? 'App movil directa' : session.deviceInfo?.browser || 'Desconocido';
  const lastOrientation = session.metadata?.lastOrientation;
  const lastMotion = session.metadata?.lastMotion;
  const locationCoordinates = getLocationCoordinates(session.location);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="kids-session-dialog max-w-5xl qr-dialog-scroll border-border bg-white text-foreground">
        <DialogHeader className="kids-session-modal-heading text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Activity className="h-5 w-5 shrink-0 text-primary" />
              Detalles de sesión
            </DialogTitle>
            {/* Botón Exportar PDF */}
            <ExportPDFButton 
              sessionId={session.sessionId} 
              variant="outline"
              size="sm"
              showLabel={true}
            />
          </div>
          <DialogDescription>
            Resumen, ubicación, permisos y actividad de la sesión.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="kids-session-tabs grid h-auto w-full grid-cols-2 gap-1 border border-border bg-muted/40 p-1 sm:grid-cols-5">
            <TabsTrigger
              value="overview"
              className="min-h-10 min-w-0 whitespace-normal text-xs text-muted-foreground sm:text-sm"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="min-h-10 min-w-0 whitespace-normal text-xs text-muted-foreground sm:text-sm"
            >
              Red y Ubicación
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="min-h-10 min-w-0 whitespace-normal text-xs text-muted-foreground sm:text-sm"
            >
              Permisos
            </TabsTrigger>
            <TabsTrigger
              value="location-history"
              className="min-h-10 min-w-0 whitespace-normal text-xs text-muted-foreground sm:text-sm"
            >
              <MapPin className="mr-1 h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="min-h-10 min-w-0 whitespace-normal text-xs text-muted-foreground sm:text-sm"
            >
              Eventos
            </TabsTrigger>
          </TabsList>

          {/* Resumen */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {isMobileAppSession && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <Smartphone className="h-4 w-4" />
                    Persona en auxilio
                  </p>
                  {mobileProfileLoading && <Loader2 className="h-4 w-4 animate-spin text-foreground/60" />}
                </div>

                <div className="grid gap-4 md:grid-cols-[96px_1fr]">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                    {displayMobileProfile?.avatarThumbnailUrl || displayMobileProfile?.avatarUri ? (
                      <img
                        src={displayMobileProfile.avatarThumbnailUrl || displayMobileProfile.avatarUri}
                        alt={displayMobileProfile.fullName || displayMobileProfile.securityId || 'Persona en auxilio'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-9 w-9 text-foreground/35" />
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-foreground/45">Nombre</p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {displayMobileProfile?.fullName || 'Sin nombre registrado'}
                      </p>
                      <p className="mt-1 text-xs font-mono text-foreground/45">
                        {displayMobileProfile?.securityId || mobileUnitId || 'Sin ID'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-foreground/45">Teléfono</p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {displayMobileProfile?.phone || 'Sin teléfono registrado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-foreground/45">Contacto emergencia</p>
                      <p className="mt-1 text-sm text-foreground">
                        {displayMobileProfile?.emergencyContact?.name || 'Sin contacto'}
                      </p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {[displayMobileProfile?.emergencyContact?.relationship, displayMobileProfile?.emergencyContact?.phone]
                          .filter(Boolean)
                          .join(' · ') || 'Sin teléfono de contacto'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-foreground/45">Datos médicos</p>
                      <p className="mt-1 text-sm text-foreground">
                        Grupo sanguíneo: {displayMobileProfile?.bloodType || 'No registrado'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Evidencia guardada</p>
                  <p className="mt-1 text-xs text-foreground/55">
                    Capturas y clips se consultan por esta sesión aunque el estado sea {session.status}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onViewScreen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border bg-card text-foreground hover:bg-muted"
                      onClick={() => onViewScreen(session.sessionId)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capturas
                    </Button>
                  )}
                  {onViewAudio && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border bg-card text-foreground hover:bg-muted"
                      onClick={() => onViewAudio(session.sessionId)}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Audio
                    </Button>
                  )}
                  {onViewRecordings && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border bg-card text-foreground hover:bg-muted"
                      onClick={() => onViewRecordings(session.sessionId)}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Grabaciones
                    </Button>
                  )}
                  {onViewLive && session.status === 'active' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/20"
                      onClick={() => onViewLive(session.sessionId)}
                    >
                      <Monitor className="mr-2 h-4 w-4" />
                      En vivo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* IDs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground opacity-60">Session ID</p>
                <p className="text-xs font-mono bg-muted bg-opacity-60 border border-border p-2 rounded text-foreground">
                  {session.sessionId}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground opacity-60">QR Asociado</p>
                <p className="text-sm font-medium text-foreground">{session.qrName}</p>
                <p className="text-xs font-mono text-foreground opacity-50">{session.qrId}</p>
              </div>
            </div>

            <Separator />

            {!isMobileAppSession && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <UserRound className="w-4 h-4" />
                      Identidad QR / Link
                    </p>
                    {subjectLoading && <Loader2 className="h-4 w-4 animate-spin text-foreground/60" />}
                  </div>

                  <div className="rounded-lg border border-border bg-muted/60 p-4">
                    <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                      <div className="space-y-2">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                          {avatarDataUrl || subject?.photoThumbnailUrl || subject?.photoUrl || session.subject?.photoThumbnailUrl ? (
                            <img
                              src={avatarDataUrl || subject?.photoThumbnailUrl || subject?.photoUrl || session.subject?.photoThumbnailUrl}
                              alt="Identidad asignada"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound className="h-8 w-8 text-foreground/35" />
                          )}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground hover:bg-muted">
                          <ImagePlus className="h-4 w-4" />
                          Foto
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => handleSubjectAvatar(event.target.files?.[0])}
                          />
                        </label>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-xs text-foreground/60">
                            Nombre
                            <input
                              value={subjectForm.displayName}
                              onChange={(event) => setSubjectForm((current) => ({ ...current, displayName: event.target.value }))}
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
                              placeholder="Nombre de la persona"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-foreground/60">
                            Teléfono
                            <input
                              value={subjectForm.phone}
                              onChange={(event) => setSubjectForm((current) => ({ ...current, phone: event.target.value }))}
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
                              placeholder="+57..."
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-xs text-foreground/60">
                            Correo
                            <input
                              value={subjectForm.email}
                              onChange={(event) => setSubjectForm((current) => ({ ...current, email: event.target.value }))}
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
                              placeholder="correo@dominio.com"
                            />
                          </label>
                          <label className="space-y-1 text-xs text-foreground/60">
                            Etiquetas
                            <input
                              value={subjectForm.tags}
                              onChange={(event) => setSubjectForm((current) => ({ ...current, tags: event.target.value }))}
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
                              placeholder="cliente, prueba, prioridad"
                            />
                          </label>
                        </div>
                        <label className="space-y-1 text-xs text-foreground/60">
                          Notas
                          <textarea
                            value={subjectForm.notes}
                            onChange={(event) => setSubjectForm((current) => ({ ...current, notes: event.target.value }))}
                            className="min-h-20 w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
                            placeholder="Notas internas del administrador"
                          />
                        </label>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className={`text-xs ${subjectMessage === 'Identidad guardada' ? 'text-emerald-700' : 'text-foreground/55'}`}>
                            {subjectMessage || (subject ? 'Identidad vinculada a esta sesión' : 'Sin identidad asignada')}
                          </p>
                          <button
                            type="button"
                            onClick={saveSubject}
                            disabled={subjectSaving || subjectLoading}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {subjectSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar identidad
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Estado y duración */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 p-3 bg-muted bg-opacity-60 border border-border rounded-lg">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-foreground opacity-50">Estado</p>
                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                    {session.status === 'active' ? 'Activa' : session.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted bg-opacity-60 border border-border rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-foreground opacity-50">Duración</p>
                  <p className="text-sm font-semibold text-foreground">{duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted bg-opacity-60 border border-border rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-xs text-foreground opacity-50">Inicio</p>
                  <p className="text-sm font-semibold text-foreground">
                    {session.startedAt || (session as any).createdAt
                      ? new Date(session.startedAt || (session as any).createdAt).toLocaleString('es-ES', { 
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dispositivo */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Información del Dispositivo
              </p>
              <div className="bg-muted bg-opacity-60 border border-border p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-foreground opacity-60">Navegador:</span>
                  <span className="text-sm font-medium">
                    {displayBrowser}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground opacity-60">Sistema Operativo:</span>
                  <span className="text-sm font-medium">
                    {displayPlatform}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground opacity-60">Tipo:</span>
                  <span className="text-sm font-medium">
                    {displayDeviceTypeLabel}
                  </span>
                </div>
                {(session.browserDeviceId || session.deviceInfo?.browserDeviceId) && (
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-foreground opacity-60">ID navegador:</span>
                    <span className="max-w-[220px] truncate font-mono text-xs text-foreground">
                      {session.browserDeviceId || session.deviceInfo?.browserDeviceId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isMobileAppSession && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Unidad móvil
                  </p>
                  <div className="bg-muted bg-opacity-60 border border-border p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground opacity-60">Unidad:</span>
                      <span className="text-sm font-mono text-foreground">{session.mobile?.unitId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground opacity-60">Plataforma:</span>
                      <span className="text-sm font-medium text-foreground">
                        {session.mobile?.platform || session.deviceInfo?.platform || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground opacity-60">Bluetooth:</span>
                      <span className="text-sm font-medium text-foreground">
                        {session.mobile?.bluetooth?.connected
                          ? session.mobile.bluetooth.deviceName || 'Vinculado'
                          : 'No vinculado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground opacity-60">Estado app:</span>
                      <span className="text-sm font-medium text-foreground">
                        {session.mobile?.appState || 'N/A'}
                        {session.mobile?.lastLifecycleSource ? ` · ${session.mobile.lastLifecycleSource}` : ''}
                      </span>
                    </div>
                    {session.capabilities?.background && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="rounded border border-border bg-card/60 px-2 py-1 text-xs text-foreground/70">
                          GPS bg: {session.capabilities.background.gps ? 'Activo' : 'No'}
                        </div>
                        <div className="rounded border border-border bg-card/60 px-2 py-1 text-xs text-foreground/70">
                          HB bg: {session.capabilities.background.heartbeat ? 'Activo' : 'No'}
                        </div>
                        <div className="rounded border border-border bg-card/60 px-2 py-1 text-xs text-foreground/70">
                          Cámara bg: {session.capabilities.background.camera ? 'Activo' : 'Limitado'}
                        </div>
                        <div className="rounded border border-border bg-card/60 px-2 py-1 text-xs text-foreground/70">
                          Mic bg: {session.capabilities.background.microphone ? 'Activo' : 'Limitado'}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-foreground opacity-60">Último sensor:</span>
                      <span className="text-sm font-medium text-foreground">
                        {lastMotion?.timestamp || lastOrientation?.timestamp
                          ? new Date(lastMotion?.timestamp || lastOrientation?.timestamp || '').toLocaleString('es-ES')
                          : 'Sin datos'}
                      </span>
                    </div>
                    {lastMotion?.acceleration && (
                      <div className="text-xs font-mono text-foreground/70">
                        Acc: x={lastMotion.acceleration.x.toFixed(2)} y={lastMotion.acceleration.y.toFixed(2)} z={lastMotion.acceleration.z.toFixed(2)}
                      </div>
                    )}
                    {lastOrientation && (
                      <div className="text-xs font-mono text-foreground/70">
                        Ori: α={lastOrientation.alpha.toFixed(2)} β={lastOrientation.beta.toFixed(2)} γ={lastOrientation.gamma.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="network" className="mt-5"><SessionNetworkPanel session={session} coordinates={locationCoordinates} /></TabsContent>
          <TabsContent value="permissions" className="mt-5"><SessionPermissionCards session={session} /></TabsContent>

          {/* Historial de Ubicación */}
          <TabsContent value="location-history" className="mt-4">
            <LocationHistoryTab 
              sessionId={session.sessionId}
              deviceType={isMobileAppSession ? 'mobile' : session.deviceInfo?.deviceType || 'desktop'}
            />
          </TabsContent>

          {/* Eventos */}
          <TabsContent value="events" className="mt-4">
            <div className="space-y-4">
              {/* Card de Correlación Multi-Session (si existe) */}
              <CorrelatedSessionsCard sessionId={session.sessionId} />
              
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 break-all">
                <p className="text-sm font-medium text-foreground">Registro de actividad</p>
                <Badge variant="outline" className="max-w-full break-all whitespace-normal text-[11px] font-mono border-border bg-muted/40 text-muted-foreground">
                  {session.sessionId}
                </Badge>
              </div>
              
              {/* Componente ForensicTimeline - Eventos P0 dinámicos */}
              <ForensicTimeline sessionId={session.sessionId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

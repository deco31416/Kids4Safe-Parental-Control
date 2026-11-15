'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, RefreshCw, Save, Smartphone, UserRound } from 'lucide-react';
import { AdminAPI, type MobileAppProfile } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsEmptyState, SettingsNotice, SettingsSearch } from './SettingsPrimitives';
import { SettingsIdentityCard } from './SettingsIdentityCard';
import { MobileDeviceStatus } from './MobileDeviceStatus';
import { RemoveStoredPhotoButton } from './RemoveStoredPhotoButton';

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const PAGE_SIZE = 20;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

type FormState = {
  fullName: string;
  phone: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  bloodType: string;
};

const emptyPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toForm(profile: MobileAppProfile): FormState {
  return {
    fullName: profile.fullName || '',
    phone: profile.phone || '',
    emergencyName: profile.emergencyContact?.name || '',
    emergencyRelationship: profile.emergencyContact?.relationship || '',
    emergencyPhone: profile.emergencyContact?.phone || '',
    bloodType: profile.bloodType || '',
  };
}

export function MobileProfilesTab() {
  const [profiles, setProfiles] = useState<MobileAppProfile[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('error');
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<MobileAppProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();

  const query = useMemo(() => search.trim(), [search]);

  const load = async (nextPage = page) => {
    setLoading(true);
    setLoadFailed(false);
    setMessage('');
    try {
      const response = await AdminAPI.getMobileAppProfiles({
        page: nextPage,
        limit: PAGE_SIZE,
        search: query,
      });
      setProfiles(response.items);
      setPagination(response.pagination || emptyPagination);
      setPage(nextPage);
    } catch (error) {
      setLoadFailed(true);
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'No se pudieron cargar perfiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const openEditor = (profile: MobileAppProfile) => {
    setSelected(profile);
    setForm(toForm(profile));
    setAvatarDataUrl(undefined);
    setMessage('');
  };

  const save = async () => {
    if (!selected || !form) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await AdminAPI.updateMobileAppProfile(selected.mobileUnitId, {
        fullName: form.fullName,
        phone: form.phone,
        bloodType: form.bloodType,
        emergencyContact: {
          name: form.emergencyName,
          relationship: form.emergencyRelationship,
          phone: form.emergencyPhone,
        },
        avatarDataUrl,
      });

      setProfiles((current) =>
        current.map((profile) => profile.mobileUnitId === selected.mobileUnitId ? response.profile : profile),
      );
      setSelected(response.profile);
      setForm(toForm(response.profile));
      setAvatarDataUrl(undefined);
      setMessageKind('success');
      setMessage('Perfil móvil guardado');
    } catch (error) {
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await AdminAPI.removeMobileAppProfileAvatar(selected.mobileUnitId);
      setProfiles((current) => current.map((item) =>
        item.mobileUnitId === selected.mobileUnitId ? response.profile : item));
      setSelected(response.profile);
      setAvatarDataUrl(undefined);
      setMessageKind('success');
      setMessage('Foto del perfil eliminada');
    } catch (error) {
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar la foto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="kids-settings-card">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Smartphone className="h-5 w-5 text-foreground" />
              Usuarios de la app
            </CardTitle>
            <CardDescription className="text-foreground opacity-60">
              Una ficha por unidad móvil, con sus datos y contacto de emergencia.
            </CardDescription>
            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">{loading ? 'Consultando…' : loadFailed ? 'Consulta pendiente' : `${pagination.total} unidades registradas`}</span>
          </div>
          <Button variant="outline" className="border-border bg-card text-foreground" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsSearch value={search} onChange={setSearch} onSearch={() => void load(1)} placeholder="Buscar por nombre, teléfono, unidad o ID" loading={loading} />
        {message && !selected && <SettingsNotice tone={messageKind}>{message}</SettingsNotice>}

        {loading ? <SettingsEmptyState title="Cargando perfiles" description="Estamos consultando los registros disponibles." icon={<Loader2 className="h-6 w-6 animate-spin" />} /> : loadFailed ? <SettingsEmptyState title="Consulta no disponible" description="Vuelve a consultar para recuperar los registros." icon={<Smartphone className="h-6 w-6" />} action={<Button variant="outline" onClick={() => void load(page)}>Reintentar</Button>} /> : profiles.length === 0 ? <SettingsEmptyState title={query ? 'No hay coincidencias' : 'Aún no hay perfiles móviles'} description={query ? 'Prueba con otro nombre o identificador.' : 'Los perfiles aparecerán cuando se registre una unidad desde la app.'} icon={<Smartphone className="h-6 w-6" />} /> : <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {profiles.map(profile => <SettingsIdentityCard key={profile.mobileUnitId} title={profile.fullName || 'Sin nombre'} subtitle={profile.phone || 'Sin teléfono'} avatar={profile.avatarThumbnailUrl || profile.avatarUri} badge={<span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-primary">{profile.securityId || 'Sin ID'}</span>} onEdit={() => openEditor(profile)}>
            <div className="kids-content-card rounded-xl bg-muted/40 p-3"><p className="mb-1 text-[11px] font-medium text-muted-foreground">Contacto de emergencia</p><p className="break-words text-sm">{profile.emergencyContact?.name || 'Sin contacto registrado'}</p>{profile.emergencyContact?.phone && <p className="mt-1 text-xs text-muted-foreground">{profile.emergencyContact.phone}</p>}</div>
            <div className="flex flex-wrap gap-2 text-[11px]"><span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">Sangre: {profile.bloodType || 'No indicada'}</span>{profile.profileExists === false && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Ficha pendiente</span>}</div>
            <MobileDeviceStatus profile={profile} />
          </SettingsIdentityCard>)}
        </div>}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/60">
          <span>{loadFailed ? 'Sin datos actualizados' : `Total: ${pagination.total}`}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 border-border bg-card text-foreground" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-20 text-center">{pagination.page} / {pagination.totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8 border-border bg-card text-foreground" aria-label="Página siguiente" disabled={page >= pagination.totalPages || loading} onClick={() => load(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !saving) { setSelected(null); setAvatarDataUrl(undefined); setMessage(''); } }}>
        <DialogContent className="kids-settings-dialog qr-dialog-scroll max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ficha de usuario app</DialogTitle>
            <DialogDescription>
              Consulta y actualiza el perfil de la persona y sus dispositivos móviles vinculados.
            </DialogDescription>
          </DialogHeader>
          {message && selected && <SettingsNotice tone={messageKind}>{message}</SettingsNotice>}
          {selected && form && (
            <div className="grid min-w-0 gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                  {avatarDataUrl || selected.avatarThumbnailUrl || selected.avatarUri ? (
                    <img src={avatarDataUrl || selected.avatarThumbnailUrl || selected.avatarUri} alt={form.fullName || selected.securityId} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-10 w-10 text-foreground/40" />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
                  <ImagePlus className="h-4 w-4" />
                  Foto
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > MAX_AVATAR_BYTES) {
                        setMessageKind('error');
                        setMessage('La foto no puede superar 4 MB');
                        event.target.value = '';
                        return;
                      }
                      try { setAvatarDataUrl(await fileToDataUrl(file)); } catch { setMessageKind('error'); setMessage('No se pudo leer la foto. Prueba con otra imagen.'); }
                    }}
                  />
                </label>
                <RemoveStoredPhotoButton
                  disabled={saving}
                  hasPhoto={Boolean(avatarDataUrl || selected.avatarThumbnailUrl || selected.avatarUri)}
                  onRemove={removeAvatar}
                />
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-foreground/60">
                    Nombre completo
                    <Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Teléfono
                    <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-foreground/60">
                    ID de seguridad
                    <Input value={selected.securityId} disabled className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Grupo sanguíneo
                    <select value={form.bloodType} onChange={(event) => setForm({ ...form, bloodType: event.target.value })} className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground">
                      {BLOOD_TYPES.map((type) => <option key={type || 'empty'} value={type}>{type || 'No indicado'}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs text-foreground/60">
                    Contacto emergencia
                    <Input value={form.emergencyName} onChange={(event) => setForm({ ...form, emergencyName: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Relación
                    <Input value={form.emergencyRelationship} onChange={(event) => setForm({ ...form, emergencyRelationship: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Teléfono emergencia
                    <Input value={form.emergencyPhone} onChange={(event) => setForm({ ...form, emergencyPhone: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                </div>
                <label className="space-y-1 text-xs text-foreground/60">
                  ID de unidad móvil
                  <Textarea value={selected.mobileUnitId} disabled className="min-h-16 resize-none border-border bg-card font-mono text-xs text-foreground/70" />
                </label>
                <div className="rounded-lg border border-border bg-card p-3">
                  <MobileDeviceStatus profile={selected} />
                  <p className="mt-2 text-[11px] text-foreground/35">Los tokens push no se exponen en el panel.</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button variant="outline" onClick={() => { setSelected(null); setAvatarDataUrl(undefined); setMessage(''); }} disabled={saving}>Cancelar</Button>
                  <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar ficha
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

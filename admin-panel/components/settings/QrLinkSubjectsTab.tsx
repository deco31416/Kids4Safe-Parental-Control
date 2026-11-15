'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Link2, Loader2, RefreshCw, Save, UserRound } from 'lucide-react';
import { AdminAPI, type QrLinkSubject } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsEmptyState, SettingsNotice, SettingsSearch } from './SettingsPrimitives';
import { SettingsIdentityCard } from './SettingsIdentityCard';
import { RemoveStoredPhotoButton } from './RemoveStoredPhotoButton';

const PAGE_SIZE = 20;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

type FormState = {
  displayName: string;
  phone: string;
  email: string;
  notes: string;
  tags: string;
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

function subjectId(subject: QrLinkSubject) {
  return subject._id || subject.id || '';
}

function toForm(subject: QrLinkSubject): FormState {
  return {
    displayName: subject.displayName || '',
    phone: subject.phone || '',
    email: subject.email || '',
    notes: subject.notes || '',
    tags: subject.tags?.join(', ') || '',
  };
}

export function QrLinkSubjectsTab() {
  const [subjects, setSubjects] = useState<QrLinkSubject[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('error');
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<QrLinkSubject | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();

  const query = useMemo(() => search.trim(), [search]);

  const load = async (nextPage = page) => {
    setLoading(true);
    setLoadFailed(false);
    setMessage('');
    try {
      const response = await AdminAPI.getQrLinkSubjects({
        page: nextPage,
        limit: PAGE_SIZE,
        search: query,
      });
      setSubjects(response.items);
      setPagination(response.pagination || emptyPagination);
      setPage(nextPage);
    } catch (error) {
      setLoadFailed(true);
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'No se pudieron cargar identidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const openEditor = (subject: QrLinkSubject) => {
    setSelected(subject);
    setForm(toForm(subject));
    setAvatarDataUrl(undefined);
    setMessage('');
  };

  const save = async () => {
    if (!selected || !form) return;
    const id = subjectId(selected);
    if (!id) {
      setMessageKind('error');
      setMessage('Identidad sin ID válido');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await AdminAPI.updateQrLinkSubject(id, {
        displayName: form.displayName,
        phone: form.phone,
        email: form.email,
        notes: form.notes,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        avatarDataUrl,
      });

      setSubjects((current) => current.map((item) => subjectId(item) === id ? response.subject : item));
      setSelected(response.subject);
      setForm(toForm(response.subject));
      setAvatarDataUrl(undefined);
      setMessageKind('success');
      setMessage('Identidad QR/link guardada');
    } catch (error) {
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la identidad');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!selected) return;
    const id = subjectId(selected);
    if (!id) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await AdminAPI.removeQrLinkSubjectPhoto(id);
      setSubjects((current) => current.map((item) => subjectId(item) === id ? response.subject : item));
      setSelected(response.subject);
      setAvatarDataUrl(undefined);
      setMessageKind('success');
      setMessage('Foto de identidad eliminada');
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
              <Link2 className="h-5 w-5 text-foreground" />
              Usuarios QR / Link
            </CardTitle>
            <CardDescription className="text-foreground opacity-60">
              Personas vinculadas a sesiones que entran desde un QR o enlace.
            </CardDescription>
            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-primary">{loading ? 'Consultando…' : loadFailed ? 'Consulta pendiente' : `${pagination.total} identidades asignadas`}</span>
          </div>
          <Button variant="outline" className="border-border bg-card text-foreground" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsSearch value={search} onChange={setSearch} onSearch={() => void load(1)} placeholder="Buscar por nombre, teléfono, correo, QR o sesión" loading={loading} />
        {message && !selected && <SettingsNotice tone={messageKind}>{message}</SettingsNotice>}

        {loading ? <SettingsEmptyState title="Cargando identidades" description="Estamos consultando los registros disponibles." icon={<Loader2 className="h-6 w-6 animate-spin" />} /> : loadFailed ? <SettingsEmptyState title="Consulta no disponible" description="Vuelve a consultar para recuperar los registros." icon={<Link2 className="h-6 w-6" />} action={<Button variant="outline" onClick={() => void load(page)}>Reintentar</Button>} /> : subjects.length === 0 ? <SettingsEmptyState title={query ? 'No hay coincidencias' : 'Sin identidades QR / Link'} description={query ? 'Prueba con otro nombre o identificador.' : 'Las identidades aparecerán cuando se asignen a una sesión QR o enlace.'} icon={<Link2 className="h-6 w-6" />} /> : <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {subjects.map(subject => <SettingsIdentityCard key={subjectId(subject)} title={subject.displayName || 'Sin nombre'} subtitle={subject.email || 'Sin correo'} avatar={subject.photoThumbnailUrl || subject.photoUrl} badge={subject.tags?.length ? <span className="text-[11px] text-primary">{subject.tags.slice(0, 3).join(' · ')}</span> : undefined} onEdit={() => openEditor(subject)}>
            <div className="kids-content-card rounded-xl bg-muted/40 p-3"><p className="text-[11px] font-medium text-muted-foreground">Contacto</p><p className="mt-1 break-words text-sm">{subject.phone || 'Sin teléfono registrado'}</p></div>
            <div className="flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-primary">{subject.linkedSessionIds?.length || 0} sesiones</span><span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">{subject.linkedQrIds?.length || 0} QR / enlaces</span></div>
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
            <DialogTitle>Ficha QR / Link</DialogTitle>
            <DialogDescription>
              Consulta y actualiza la persona vinculada al código QR o enlace seleccionado.
            </DialogDescription>
          </DialogHeader>
          {message && selected && <SettingsNotice tone={messageKind}>{message}</SettingsNotice>}
          {selected && form && (
            <div className="grid min-w-0 gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
              <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                  {avatarDataUrl || selected.photoThumbnailUrl || selected.photoUrl ? (
                    <img src={avatarDataUrl || selected.photoThumbnailUrl || selected.photoUrl} alt={form.displayName} className="h-full w-full object-cover" />
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
                  hasPhoto={Boolean(avatarDataUrl || selected.photoThumbnailUrl || selected.photoUrl)}
                  onRemove={removePhoto}
                />
              </div>

              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-foreground/60">
                    Nombre
                    <Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Teléfono
                    <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-foreground/60">
                    Correo
                    <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Etiquetas
                    <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="border-border bg-card text-foreground" />
                  </label>
                </div>
                <label className="space-y-1 text-xs text-foreground/60">
                  Notas
                  <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-24 resize-none border-border bg-card text-foreground" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-foreground/60">
                    QR / links vinculados
                    <Textarea value={(selected.linkedQrIds || []).join('\n')} disabled className="min-h-24 resize-none border-border bg-card font-mono text-xs text-foreground/70" />
                  </label>
                  <label className="space-y-1 text-xs text-foreground/60">
                    Sesiones vinculadas
                    <Textarea value={(selected.linkedSessionIds || []).slice(0, 10).join('\n')} disabled className="min-h-24 resize-none border-border bg-card font-mono text-xs text-foreground/70" />
                  </label>
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

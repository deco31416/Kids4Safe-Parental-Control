'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, LockKeyhole, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { AdminAPI, type AdminUser, type CreateAdminUserPayload } from '@/lib/admin-api';
import { AdminPermissionError, canManageAdminUsers, settingsErrorMessage } from '@/lib/admin-access';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DashboardPager } from '@/components/dashboard/DashboardPager';
import { ADMIN_PERMISSIONS, AdminUserForm } from './AdminUserForm';
import { SettingsEmptyState, SettingsMetric, SettingsNotice } from './SettingsPrimitives';

const PAGE_SIZE = 6;
const newForm = (): CreateAdminUserPayload => ({ username: '', email: '', password: '', role: 'admin', permissions: ['create_qr', 'view_qr', 'edit_qr', 'delete_qr', 'view_sessions'] });
const userId = (user: AdminUser) => user.id || user._id || user.username;
export function AdminUsersCard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(newForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [action, setAction] = useState<{ kind: 'delete' | 'toggle'; user: AdminUser } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loadUsers = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const profile = await AdminAPI.getProfile();
      const permitted = canManageAdminUsers(profile);
      setAllowed(permitted);
      if (!permitted) { setUsers([]); setLoaded(false); return; }
      setUsers(await AdminAPI.getAdminUsers()); setLoaded(true);
    } catch (error) {
      if (error instanceof AdminPermissionError) { setAllowed(false); setUsers([]); setLoaded(false); }
      else setLoadError(settingsErrorMessage(error, 'No se pudieron cargar los administradores.'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => setPage(1), [query, role, status]);
  const filtered = useMemo(() => users.filter(user => {
    const text = query.trim().toLowerCase();
    return (!text || `${user.username} ${user.email}`.toLowerCase().includes(text)) && (role === 'all' || user.role === role) && (status === 'all' || (status === 'active' ? user.isActive !== false : user.isActive === false));
  }), [users, query, role, status]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const closeCreate = () => { if (!saving) { setCreateOpen(false); setForm(newForm()); setFormError(null); } };
  const createUser = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setFormError(null); setMessage(null);
    try { await AdminAPI.createAdminUser(form); setCreateOpen(false); setForm(newForm()); await loadUsers(); setMessage('Administrador creado correctamente.'); }
    catch (error) { setFormError(settingsErrorMessage(error, 'No se pudo crear el administrador.')); }
    finally { setSaving(false); }
  };
  const confirmAction = async () => {
    if (!action || busy) return; setBusy(true); setActionError(null); setMessage(null);
    try {
      if (action.kind === 'delete') await AdminAPI.deleteAdminUser(userId(action.user)); else await AdminAPI.toggleAdminUser(userId(action.user));
      setAction(null); await loadUsers(); setMessage(action.kind === 'delete' ? 'Administrador eliminado.' : 'Estado del administrador actualizado.');
    } catch (error) { setActionError(settingsErrorMessage(error, 'No se pudo completar la acción.')); }
    finally { setBusy(false); }
  };
  return <Card className="kids-settings-card">
    <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Usuarios administrativos</CardTitle><CardDescription>Accesos al panel, roles y herramientas de cada cuenta.</CardDescription></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>{allowed && <Button size="sm" className="gap-2" onClick={() => { setFormError(null); setCreateOpen(true); }}><UserPlus className="h-4 w-4" />Nuevo administrador</Button>}</div>
    </div></CardHeader>
    <CardContent className="space-y-5">
      {message && <SettingsNotice tone="success">{message}</SettingsNotice>}
      {loading ? <SettingsEmptyState title="Consultando accesos" description="Estamos revisando los permisos y las cuentas disponibles." icon={<Loader2 className="h-6 w-6 animate-spin" />} />
      : allowed === false ? <SettingsEmptyState title="Acceso restringido" description="Tu cuenta no tiene el permiso Usuarios y roles para administrar otras cuentas. Un superadministrador puede revisar este acceso." icon={<LockKeyhole className="h-6 w-6" />} action={<Button asChild variant="outline"><Link href="/dashboard/settings?tab=account">Ver mi perfil</Link></Button>} />
      : <>
        {loadError && <SettingsNotice tone="error">{loadError}<Button variant="outline" size="sm" className="ml-2" onClick={() => void loadUsers()}>Reintentar</Button></SettingsNotice>}
        {loaded && !loadError && <div className="grid gap-3 sm:grid-cols-3"><SettingsMetric label="Cuentas registradas" value={users.length} icon={<Users className="h-4 w-4" />} /><SettingsMetric label="Cuentas activas" value={users.filter(user => user.isActive !== false).length} icon={<ShieldCheck className="h-4 w-4" />} /><SettingsMetric label="Superadministradores" value={users.filter(user => user.role === 'superadmin').length} icon={<LockKeyhole className="h-4 w-4" />} /></div>}
        {loaded && !loadError && <>
          <div className="grid min-w-0 gap-2 rounded-2xl border border-border bg-muted/30 p-3 md:grid-cols-[minmax(0,1fr)_170px_150px]">
            <label className="relative min-w-0"><span className="sr-only">Buscar administrador</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por usuario o correo" className="pl-10" /></label>
            <label><span className="sr-only">Filtrar por rol</span><select className="kids-settings-select" value={role} onChange={event => setRole(event.target.value)}><option value="all">Todos los roles</option><option value="admin">Administrador</option><option value="superadmin">Superadministrador</option></select></label>
            <label><span className="sr-only">Filtrar por estado</span><select className="kids-settings-select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label>
          </div>
          {!filtered.length ? <SettingsEmptyState title="No hay cuentas para mostrar" description="Prueba con otra búsqueda o crea un administrador para darle acceso al panel." icon={<Users className="h-6 w-6" />} /> : <div className="grid gap-3 xl:grid-cols-2">{filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(user => <article key={userId(user)} className="kids-content-card min-w-0 space-y-4 rounded-2xl border border-border bg-white p-4">
            <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary"><ShieldCheck className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words font-semibold">{user.username}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p></div></div>
            <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-primary">{user.role === 'superadmin' ? 'Superadministrador' : 'Administrador'}</span><span className={`rounded-full px-2.5 py-1 ${user.isActive !== false ? 'bg-teal-50 text-teal-700' : 'bg-muted text-muted-foreground'}`}>{user.isActive !== false ? 'Activo' : 'Inactivo'}</span></div>
            <div className="flex flex-wrap gap-1.5">{(user.permissions || []).map(permission => <span key={permission} className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">{ADMIN_PERMISSIONS.find(item => item.id === permission)?.label || permission}</span>)}</div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3"><Button size="sm" variant="outline" onClick={() => { setActionError(null); setAction({ kind: 'toggle', user }); }}>{user.isActive !== false ? 'Desactivar' : 'Activar'}</Button><Button size="sm" variant="outline" className="gap-2 text-red-700" onClick={() => { setActionError(null); setAction({ kind: 'delete', user }); }}><Trash2 className="h-3.5 w-3.5" />Eliminar</Button></div>
          </article>)}</div>}
          <DashboardPager page={currentPage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>}
      </>}
    </CardContent>
    <Dialog open={createOpen} onOpenChange={open => { if (!open) closeCreate(); }}><DialogContent className="kids-settings-dialog max-w-2xl"><DialogHeader><DialogTitle>Nuevo administrador</DialogTitle><DialogDescription>Define su cuenta y los permisos de acceso al panel.</DialogDescription></DialogHeader><AdminUserForm form={form} onChange={setForm} onSubmit={createUser} saving={saving} error={formError} onCancel={closeCreate} /></DialogContent></Dialog>
    <AlertDialog open={!!action} onOpenChange={open => { if (!open && !busy) setAction(null); }}><AlertDialogContent className="kids-settings-dialog"><AlertDialogHeader><AlertDialogTitle>{action?.kind === 'delete' ? 'Eliminar administrador' : action?.user.isActive !== false ? 'Desactivar administrador' : 'Activar administrador'}</AlertDialogTitle><AlertDialogDescription>{action?.kind === 'delete' ? `Se eliminará la cuenta ${action.user.username}. Esta acción no se puede deshacer.` : `Se cambiará el acceso al panel de ${action?.user.username}.`}</AlertDialogDescription></AlertDialogHeader>{actionError && <SettingsNotice tone="error">{actionError}</SettingsNotice>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button disabled={busy} variant={action?.kind === 'delete' ? 'destructive' : 'default'} onClick={() => void confirmAction()}>{busy ? 'Procesando…' : 'Confirmar'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Card>;
}

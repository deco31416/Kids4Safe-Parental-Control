'use client';
import type { FormEvent } from 'react';
import { Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import type { CreateAdminUserPayload } from '@/lib/admin-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SettingsNotice } from './SettingsPrimitives';
export const ADMIN_PERMISSIONS = [
  { id: 'create_qr', label: 'Crear QR', group: 'Códigos QR' }, { id: 'view_qr', label: 'Ver QR', group: 'Códigos QR' },
  { id: 'edit_qr', label: 'Editar QR', group: 'Códigos QR' }, { id: 'delete_qr', label: 'Eliminar QR', group: 'Códigos QR' },
  { id: 'view_sessions', label: 'Ver sesiones', group: 'Sesiones' }, { id: 'manage_sessions', label: 'Gestionar sesiones', group: 'Sesiones' },
  { id: 'view_recordings', label: 'Ver medios guardados', group: 'Medios y reportes' }, { id: 'delete_recordings', label: 'Eliminar medios guardados', group: 'Medios y reportes' },
  { id: 'record_sessions', label: 'Registrar grabaciones', group: 'Medios y reportes' }, { id: 'export_reports', label: 'Exportar reportes', group: 'Medios y reportes' },
  { id: 'manage_users', label: 'Usuarios y roles', group: 'Administración' },
];
export function AdminUserForm({ form, onChange, onSubmit, saving, error, onCancel }: { form: CreateAdminUserPayload; onChange: (form: CreateAdminUserPayload) => void; onSubmit: (event: FormEvent) => void; saving: boolean; error: string | null; onCancel: () => void }) {
  const toggle = (permission: string) => onChange({ ...form, permissions: form.permissions.includes(permission) ? form.permissions.filter(item => item !== permission) : [...form.permissions, permission] });
  return <form onSubmit={onSubmit} className="space-y-5">
    {error && <SettingsNotice tone="error">{error}</SettingsNotice>}
    <fieldset disabled={saving} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Usuario<Input autoComplete="off" required minLength={3} value={form.username} onChange={event => onChange({ ...form, username: event.target.value })} placeholder="Nombre de usuario" /></label>
        <label className="space-y-2 text-sm font-medium">Correo<Input autoComplete="off" required type="email" value={form.email} onChange={event => onChange({ ...form, email: event.target.value })} placeholder="correo@dominio.com" /></label>
        <label className="space-y-2 text-sm font-medium">Contraseña<Input autoComplete="new-password" required minLength={8} type="password" value={form.password} onChange={event => onChange({ ...form, password: event.target.value })} placeholder="Mínimo 8 caracteres" /></label>
        <label className="space-y-2 text-sm font-medium">Rol<select className="kids-settings-select" value={form.role} onChange={event => onChange({ ...form, role: event.target.value as 'admin' | 'superadmin', permissions: event.target.value === 'superadmin' ? ADMIN_PERMISSIONS.map(item => item.id) : form.permissions })}><option value="admin">Administrador</option><option value="superadmin">Superadministrador</option></select></label>
      </div>
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Permisos de la cuenta</h3>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Selecciona las herramientas que podrá utilizar. Un superadministrador tiene acceso completo.</p>
        <div className="space-y-4">{Array.from(new Set(ADMIN_PERMISSIONS.map(item => item.group))).map(group => <fieldset key={group}><legend className="mb-2 text-xs font-semibold text-primary">{group}</legend><div className="grid gap-2 sm:grid-cols-2">{ADMIN_PERMISSIONS.filter(item => item.group === group).map(item => <label key={item.id} className="kids-permission-option flex min-w-0 items-start gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs leading-relaxed"><input type="checkbox" checked={form.permissions.includes(item.id)} disabled={form.role === 'superadmin'} onChange={() => toggle(item.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-primary)]" />{item.label}</label>)}</div></fieldset>)}</div>
      </div>
    </fieldset>
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}Crear administrador</Button></div>
  </form>;
}

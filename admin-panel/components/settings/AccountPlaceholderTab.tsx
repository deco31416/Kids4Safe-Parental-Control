'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminAPI, type AdminProfile } from '@/lib/admin-api';
import { Lock, Save, ShieldCheck, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { settingsErrorMessage } from '@/lib/admin-access';
import { formatSettingsDate } from '@/lib/settings-display';
import { SettingsNotice } from './SettingsPrimitives';

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function AccountPlaceholderTab() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ firstName: '', lastName: '', email: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminAPI.getProfile();
      setProfile(data);
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
      });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(data));
      }
    } catch (err) {
      setError(settingsErrorMessage(err, 'No se pudo cargar el perfil'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setMessage(null);

    if (!form.email.trim()) {
      setError('El correo no puede quedar vacío.');
      setSaving(false);
      return;
    }

    try {
      const response = await AdminAPI.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });
      setProfile(response.user);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(response.user));
      }
      setMessage('Perfil actualizado correctamente.');
    } catch (err) {
      setError(settingsErrorMessage(err, 'No se pudo actualizar el perfil'));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setChangingPassword(true);
    setPasswordError(null);
    setMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Completa todos los campos de contraseña.');
      setChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('La nueva contraseña y la confirmación no coinciden.');
      setChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      setChangingPassword(false);
      return;
    }

    try {
      await AdminAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordOpen(false);
      setMessage('Contraseña actualizada correctamente.');
    } catch (err) {
      setPasswordError(settingsErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setChangingPassword(false);
    }
  }

  const closePassword = () => {
    if (changingPassword) return;
    setPasswordOpen(false); setPasswordError(null);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  return <div className="space-y-5">
    {error && <SettingsNotice tone="error">{error}</SettingsNotice>}
    {message && <SettingsNotice tone="success">{message}</SettingsNotice>}
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="kids-settings-card"><CardHeader><div className="flex min-w-0 items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[#20B9BE] text-xl font-bold uppercase text-white">{profile?.username?.slice(0, 1) || <User className="h-6 w-6" />}</span><div className="min-w-0"><CardTitle>Mi perfil</CardTitle><CardDescription className="mt-1">Actualiza tus datos de contacto.</CardDescription>{profile && <p className="mt-2 break-words text-xs font-medium text-primary">@{profile.username}</p>}</div></div></CardHeader>
        <CardContent><form className="space-y-5" onSubmit={event => { event.preventDefault(); if (profile && !saving) void saveProfile(); }}>
          <fieldset disabled={loading || saving || !profile} className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">Nombre<Input autoComplete="given-name" value={form.firstName} onChange={event => setForm(current => ({ ...current, firstName: event.target.value }))} placeholder={loading ? 'Cargando…' : 'Tu nombre'} /></label>
            <label className="space-y-2 text-sm font-medium">Apellido<Input autoComplete="family-name" value={form.lastName} onChange={event => setForm(current => ({ ...current, lastName: event.target.value }))} placeholder={loading ? 'Cargando…' : 'Tu apellido'} /></label>
            <label className="space-y-2 text-sm font-medium sm:col-span-2">Correo<Input type="email" autoComplete="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="correo@dominio.com" /></label>
          </fieldset>
          <div className="flex justify-end border-t border-border pt-4"><Button type="submit" disabled={loading || saving || !profile} className="gap-2"><Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar cambios'}</Button></div>
        </form></CardContent>
      </Card>
      <div className="min-w-0 space-y-5">
        <Card className="kids-settings-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />Tu acceso</CardTitle><CardDescription>Información de la cuenta conectada.</CardDescription></CardHeader><CardContent><dl className="space-y-4 text-sm"><div><dt className="text-xs text-muted-foreground">Usuario</dt><dd className="mt-1 break-words font-medium">{profile?.username || (loading ? 'Consultando…' : 'No disponible')}</dd></div><div><dt className="text-xs text-muted-foreground">Rol</dt><dd className="mt-1 font-medium">{profile?.role === 'superadmin' ? 'Superadministrador' : profile?.role === 'admin' ? 'Administrador' : profile?.role || 'No disponible'}</dd></div><div><dt className="text-xs text-muted-foreground">Último acceso</dt><dd className="mt-1 font-medium">{formatSettingsDate(profile?.lastLogin)}</dd></div></dl></CardContent></Card>
        <Card className="kids-settings-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5 text-primary" />Seguridad de la cuenta</CardTitle><CardDescription>Protege el acceso a tu panel.</CardDescription></CardHeader><CardContent><Button variant="outline" disabled={loading || !profile} className="w-full gap-2" onClick={() => { setPasswordError(null); setPasswordOpen(true); }}><Lock className="h-4 w-4" />Cambiar contraseña</Button></CardContent></Card>
      </div>
    </div>
    <Dialog open={passwordOpen} onOpenChange={open => { if (!open) closePassword(); }}><DialogContent className="kids-settings-dialog max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />Cambiar contraseña</DialogTitle><DialogDescription>Usa al menos 8 caracteres y confirma la nueva contraseña.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!changingPassword) void changePassword(); }}>
        {passwordError && <SettingsNotice tone="error">{passwordError}</SettingsNotice>}
        <fieldset disabled={changingPassword} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">Contraseña actual<Input autoComplete="current-password" type="password" required value={passwordForm.currentPassword} onChange={event => setPasswordForm(current => ({ ...current, currentPassword: event.target.value }))} /></label>
          <label className="block space-y-2 text-sm font-medium">Nueva contraseña<Input autoComplete="new-password" type="password" required minLength={8} value={passwordForm.newPassword} onChange={event => setPasswordForm(current => ({ ...current, newPassword: event.target.value }))} /></label>
          <label className="block space-y-2 text-sm font-medium">Confirmar nueva contraseña<Input autoComplete="new-password" type="password" required minLength={8} value={passwordForm.confirmPassword} onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))} /></label>
        </fieldset>
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closePassword} disabled={changingPassword}>Cancelar</Button><Button type="submit" disabled={changingPassword}>{changingPassword ? 'Actualizando…' : 'Actualizar contraseña'}</Button></div>
      </form>
    </DialogContent></Dialog>
  </div>;
}

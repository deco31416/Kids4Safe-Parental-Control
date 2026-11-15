'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { io } from 'socket.io-client';
import { Users, Smartphone, RefreshCw, ShieldCheck } from 'lucide-react';
import { getAdminSessionToken } from '@/lib/admin-auth';
import { Family, FamilyDevice, Invitation, SupervisionSession, familyRequest } from '@/lib/family-api';
import { Button } from '@/components/ui/button';

export default function FamilyPage() {
  const [family, setFamily] = useState<Family | null>(null);
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [connected, setConnected] = useState(false), [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [name, setName] = useState(''), [child, setChild] = useState(''), [parent, setParent] = useState('');
  const [acceptToken, setAcceptToken] = useState(''), [codes, setCodes] = useState<Record<string, string>>({});
  const [invitation, setInvitation] = useState<Invitation | null>(null), [qr, setQr] = useState('');
  const refresh = useCallback(async () => {
    setFamily(await familyRequest<Family | null>('/family')); setLoaded(true);
  }, []);
  const action = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await work(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh().catch(e => { setError(e.message); setLoaded(true); }); }, [refresh]);
  useEffect(() => {
    if (!invitation) { setQr(''); return; }
    let current = true;
    void QRCode.toDataURL(invitation.token, { width: 224, margin: 2 }).then(value => { if (current) setQr(value); });
    const timer = setTimeout(() => { setInvitation(null); setQr(''); }, Math.max(0, Date.parse(invitation.expiresAt) - Date.now()));
    return () => { current = false; clearTimeout(timer); };
  }, [invitation]);
  const activeSessions = family?.sessions.filter(s => ['requested', 'authorized'].includes(s.state)).map(s => s.id).join(',') || '';
  useEffect(() => {
    if (!family?.id) return;
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL + '/supervision', {
      auth: { role: 'parent', token: getAdminSessionToken() }, transports: ['websocket'],
    });
    socket.on('connect', () => { setConnected(true); activeSessions.split(',').filter(Boolean).forEach(id => socket.emit('supervision.join', { sessionId: id })); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('supervision.changed', () => { void refresh().catch(() => setConnected(false)); });
    socket.on('supervision.state', () => { void refresh().catch(() => {}); });
    socket.on('supervision.unavailable', () => { void refresh().catch(() => {}); });
    const timer = setInterval(() => { void refresh().catch(() => setConnected(false)); }, 5000);
    return () => { clearInterval(timer); socket.disconnect(); };
  }, [family?.id, activeSessions, refresh]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const live = (s: SupervisionSession) => ['requested', 'authorized'].includes(s.state) && Date.parse(s.expiresAt) > now;
  const requestSession = async (deviceId: string) => {
    const result = await familyRequest<SupervisionSession>('/supervision/sessions', { deviceId });
    setNotice(result.notification === 'unavailable' || result.notification === 'not_configured'
      ? 'Autorizada desde tu panel. El teléfono la recibirá al abrir Kids4Safe con conexión. Todavía no se transmite pantalla.'
      : 'Autorizada desde tu panel, sin aceptación adicional en Kids4Safe. Todavía no se transmite pantalla.');
  };
  const stateLabel = (s: SupervisionSession) => s.state === 'requested'
    ? 'Solicitud anterior · inicia de nuevo desde el panel'
    : ({ authorized: s.deliveredAt ? 'Orden recibida · todavía sin compartir pantalla' : 'Autorizada por el padre o madre · esperando conexión del teléfono', rejected: 'Solicitud anterior rechazada', ended: 'Finalizada', revoked: 'Acceso revocado', expired: 'Vencida · sin autorización' }[s.state]);
  const revoke = (device: FamilyDevice) => {
    if (window.confirm('¿Desvincular ' + device.label + '? Sus sesiones de Supervisión terminarán. Auxilio conserva su funcionamiento.')) {
      void action(() => familyRequest('/family/devices/' + device.id + '/revoke', {}));
    }
  };
  const input = 'kids-auth-input';
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6">
      <div><p className="text-sm font-semibold text-primary">SUPERVISIÓN FAMILIAR</p><h1 className="mt-2 text-3xl font-bold">Un mismo equipo para cuidarles</h1>
        <p className="mt-3 text-muted-foreground">Cuentas propias. Los mismos hijos, dispositivos y derechos.</p></div>
      <Button disabled={busy} variant="outline" onClick={() => void action(refresh)}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
    </header>
    {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-2xl border border-border bg-card p-4 text-primary">{notice}</p>}
    {!loaded ? <p role="status">Cargando tu núcleo familiar…</p> : !family ? <section className="grid gap-6 md:grid-cols-2">
      <form className="space-y-4 rounded-3xl border bg-card p-6" onSubmit={e => { e.preventDefault(); void action(() => familyRequest('/family', { name })); }}>
        <h2 className="text-xl font-bold">Crear nuestro núcleo</h2><label className="block">Nombre de la familia<input className={input} required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <Button disabled={busy}>Crear familia</Button>
      </form>
      <form className="space-y-4 rounded-3xl border bg-card p-6" onSubmit={e => { e.preventDefault(); void action(() => familyRequest('/family/parent-invitations/accept', { token: acceptToken.trim() })); }}>
        <h2 className="text-xl font-bold">Unirme con mi cuenta</h2><p className="text-muted-foreground">Usa la invitación de tu pareja. Tendrán los mismos derechos.</p>
        <label className="block">Invitación temporal<input className={input} required value={acceptToken} onChange={e => setAcceptToken(e.target.value)} autoComplete="off" /></label>
        <Button disabled={busy}>Aceptar invitación</Button>
      </form>
    </section> : <>
      <section className="space-y-4 rounded-3xl border bg-card p-6"><h2 className="flex items-center gap-3 text-2xl font-bold"><Users />{family.name}</h2>
        <p>{family.parents.map(p => p.username).join(' · ')} — mismos derechos de administración familiar.</p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void action(async () => setInvitation(await familyRequest<Invitation>('/family/parent-invitations', { username: parent }))); }}>
          <label className="min-w-0 flex-1">Usuario del otro padre o madre<input className={input} required value={parent} onChange={e => setParent(e.target.value)} /></label><Button disabled={busy}>Invitar a mi pareja</Button>
        </form>
      </section>
      <section className="space-y-4 rounded-3xl border bg-card p-6"><h2 className="text-2xl font-bold">Nuestros hijos</h2>
        <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void action(async () => { await familyRequest('/family/children', { name: child }); setChild(''); }); }}>
          <label className="min-w-0 flex-1">Nombre o apodo<input className={input} required minLength={2} maxLength={80} value={child} onChange={e => setChild(e.target.value)} /></label><Button disabled={busy}>Añadir hijo</Button>
        </form>
        {family.children.map(c => <div key={c._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4"><strong>{c.name}</strong><Button variant="outline" disabled={busy} onClick={() => void action(async () => setInvitation(await familyRequest<Invitation>('/family/children/' + c._id + '/invitation', {})))}>Vincular teléfono</Button></div>)}
      </section>
      <section className="space-y-4 rounded-3xl border bg-card p-6"><h2 className="flex items-center gap-3 text-2xl font-bold"><Smartphone />Teléfonos vinculados</h2>
        {!family.devices.length && <p className="text-muted-foreground">Genera una invitación y ábrela en Perfil → Mi familia, en la app del hijo.</p>}
        {family.devices.map(d => <div key={d.id} className="space-y-3 rounded-2xl border p-4"><p className="font-semibold">{family.children.find(c => c._id === d.childId)?.name} · {d.label}</p>
          <p className="text-sm text-muted-foreground">{d.state === 'active' ? 'Vínculo confirmado' : d.state === 'pending' ? 'Pendiente de confirmar en este panel' : 'Desvinculado'}</p>
          {d.state === 'pending' && <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void action(() => familyRequest('/family/devices/' + d.id + '/confirm', { code: codes[d.id] || '' })); }}>
            <label>Código de 8 dígitos mostrado en el teléfono<input className={input} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={codes[d.id] || ''} onChange={e => setCodes({ ...codes, [d.id]: e.target.value })} /></label><Button disabled={busy}>Confirmar vínculo</Button>
          </form>}
          <div className="flex flex-wrap gap-3">{d.state === 'active' && <Button disabled={busy || family.sessions.some(s => s.deviceId === d.id && s.state === 'authorized' && live(s))} onClick={() => void action(() => requestSession(d.id))}>{family.sessions.some(s => s.deviceId === d.id && s.state === 'authorized' && live(s)) ? 'Sesión autorizada' : 'Iniciar Supervisión'}</Button>}
            {d.state !== 'revoked' && <Button disabled={busy} variant="outline" onClick={() => revoke(d)}>Desvincular teléfono</Button>}</div>
        </div>)}
      </section>
      <section className="space-y-3 rounded-3xl border bg-card p-6"><h2 className="flex items-center gap-3 text-xl font-bold"><ShieldCheck />Sesiones de Supervisión</h2>
        <p className="text-muted-foreground">Tú inicias y autorizas la sesión por 10 minutos desde este panel, sin aceptación adicional del hijo en Kids4Safe. Todavía no transmite pantalla ni activa sensores. El permiso de captura que Android exige es independiente.</p>
        <p role="status" className="text-sm text-muted-foreground">{connected ? 'Actualizaciones conectadas' : 'Actualizando por conexión alternativa. Si no hay internet, se conserva el último estado.'}</p>
        {!family.sessions.length && <p className="text-muted-foreground">Aún no hay solicitudes. Elige uno de los teléfonos vinculados.</p>}
        {family.sessions.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
          <div className="space-y-1"><p className="font-semibold">{family.children.find(c => c._id === family.devices.find(d => d.id === s.deviceId)?.childId)?.name || 'Teléfono familiar'}</p>
            <p role="status">{stateLabel(s)}</p><p className="text-sm text-muted-foreground">Solicitada por {s.requesterName}</p>
            {live(s) && <p className="text-sm text-muted-foreground">Vigencia de la sesión: {Math.max(0, Math.ceil((Date.parse(s.expiresAt) - now) / 1000))} s</p>}
          </div>{live(s) && <Button variant="outline" disabled={busy} onClick={() => void action(() => familyRequest('/supervision/sessions/' + s.id + '/end', {}))}>{s.state === 'requested' ? 'Cancelar solicitud' : 'Finalizar autorización'}</Button>}
        </div>)}
      </section>
    </>}
    {invitation && <section className="space-y-4 rounded-3xl border-2 border-primary bg-card p-6"><h2 className="text-xl font-bold">{invitation.kind === 'device' ? 'Invitación para el teléfono' : 'Invitación para tu pareja'}</h2>
      {qr && <Image src={qr} width={224} height={224} unoptimized alt="QR con la invitación temporal" />}
      <p className="text-muted-foreground">Vence en cinco minutos y se utiliza una sola vez. Compártela únicamente con tu familia.</p>
      <textarea aria-label="Código de invitación" readOnly className="w-full break-all rounded-xl border p-3" value={invitation.token} />
      <Button variant="outline" onClick={() => setInvitation(null)}>Cerrar invitación</Button>
    </section>}
  </div>;
}

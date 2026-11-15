import { getAdminSessionToken, invalidateAdminSession } from './admin-auth';
import { fetchAdminResponse } from './admin-request';
export type SupervisionSession = { id: string; deviceId: string; state: 'requested' | 'authorized' | 'rejected' | 'ended' | 'revoked' | 'expired';
  requesterName: string; requestedAt?: string; deliveredAt?: string; decidedAt?: string; endedAt?: string;
  authorizationSource: 'parent_panel' | 'legacy';
  protocol: 'supervision-v1'; expiresAt: string; mediaStarted: false;
  notification?: 'queued' | 'already_queued' | 'unavailable' | 'not_configured' | 'not_needed' };
export type FamilyDevice = { id: string; childId: string; label: string; state: 'pending' | 'active' | 'revoked'; claimExpiresAt: string };
export type Family = { id: string; name: string; children: { _id: string; name: string }[];
  parents: { id: string; username: string; active: boolean }[]; devices: FamilyDevice[]; sessions: SupervisionSession[] };
export type Invitation = { token: string; expiresAt: string; kind: string };
export async function familyRequest<T>(path: string, body?: unknown): Promise<T> {
  const token = getAdminSessionToken();
  if (!token) throw new Error('Inicia sesión en el panel');
  const response = await fetchAdminResponse(process.env.NEXT_PUBLIC_BACKEND_URL + path, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) invalidateAdminSession(token);
  const result = await response.json();
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join('. ') : result.message || 'No se pudo completar la operación');
  return result;
}

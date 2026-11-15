import type { ActiveSession, MobileAppProfile } from '@/lib/admin-api';

export interface MobilePerson {
  key: string;
  units: MobileAppProfile[];
  primary: MobileAppProfile;
}
export function getPersonKey(unit: MobileAppProfile) {
  const phone = unit.phone?.replace(/[^\d+]/g, '');
  const name = unit.fullName?.trim().toLowerCase().replace(/\s+/g, ' ');
  return unit.mobileUserId || (phone ? `phone:${phone}` : name ? `name:${name}` : `unit:${unit.mobileUnitId}`);
}
export function buildMobilePeople(units: MobileAppProfile[], sessions: Map<string, ActiveSession>): MobilePerson[] {
  const groups = new Map<string, MobileAppProfile[]>();
  units.forEach(unit => {
    const key = getPersonKey(unit);
    groups.set(key, [...(groups.get(key) || []), unit]);
  });
  return Array.from(groups, ([key, linked]) => ({ key, units: linked, primary: [...linked].sort((a, b) => {
    const active = (unit: MobileAppProfile) => sessions.get(unit.mobileUnitId)?.status === 'active' ? 1 : 0;
    const gps = (unit: MobileAppProfile) => unit.gpsAlwaysEnabled || unit.lastLocation ? 1 : 0;
    return active(b) - active(a) || gps(b) - gps(a) ||
      new Date(b.lastSeenAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.lastSeenAt || a.updatedAt || a.createdAt || 0).getTime();
  })[0] }));
}
export function mergeEmergencySessions(sessions: ActiveSession[], recent: ActiveSession[]) {
  const items = new Map(recent.map(session => [session.sessionId, session]));
  sessions.filter(session => session.source === 'mobile-app' || session.qrId?.startsWith('mobile-direct:'))
    .forEach(session => items.set(session.sessionId, session));
  return Array.from(items.values()).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}
export function hasUnitLocation(unit: MobileAppProfile) {
  return !!unit.lastLocation && Number.isFinite(unit.lastLocation.latitude) && Number.isFinite(unit.lastLocation.longitude);
}
export function unitMapsUrl(unit: MobileAppProfile) {
  return hasUnitLocation(unit) ? `https://www.google.com/maps?q=${unit.lastLocation!.latitude},${unit.lastLocation!.longitude}` : undefined;
}

/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner compiles the pure TypeScript helpers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const source = fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Map, Number, Date, Object });
  return exports;
}
const data = load('dashboard-data');
const navigation = load('dashboard-navigation');
const unit = (id, extra = {}) => ({ mobileUnitId: id, securityId: id, ...extra });
const session = (id, extra = {}) => ({ sessionId: id, source: 'mobile-app', status: 'active', createdAt: '2026-10-15T00:00:00Z', ...extra });

test('one person with two devices is counted once without losing either device', () => {
  const people = data.buildMobilePeople([unit('a', { mobileUserId: 'person' }), unit('b', { mobileUserId: 'person' })], new Map());
  assert.equal(people.length, 1);
  assert.equal(people[0].units.length, 2);
});
test('person identity takes precedence over shared names and phone numbers', () => {
  const people = data.buildMobilePeople([unit('a', { mobileUserId: 'one', fullName: 'Ana' }), unit('b', { mobileUserId: 'two', fullName: 'Ana' })], new Map());
  assert.equal(people.length, 2);
});
test('fallback grouping normalizes phone formatting and names', () => {
  assert.equal(data.getPersonKey(unit('a', { phone: '+57 300-123' })), data.getPersonKey(unit('b', { phone: '+57300123' })));
  assert.equal(data.getPersonKey(unit('a', { fullName: ' Ana  Pérez ' })), data.getPersonKey(unit('b', { fullName: 'ana pérez' })));
  assert.notEqual(data.getPersonKey(unit('a')), data.getPersonKey(unit('b')));
});
test('the device with an active emergency becomes the primary device', () => {
  const a = unit('a', { mobileUserId: 'person', gpsAlwaysEnabled: true, lastSeenAt: '2026-10-15' });
  const b = unit('b', { mobileUserId: 'person' });
  const people = data.buildMobilePeople([a, b], new Map([['b', session('emergency')]]));
  assert.equal(people[0].primary.mobileUnitId, 'b');
});
test('the primary device prefers GPS and then recent activity without reordering the input', () => {
  const units = [unit('a', { mobileUserId: 'p', lastSeenAt: '2026-10-15' }), unit('b', { mobileUserId: 'p', gpsAlwaysEnabled: true })];
  assert.equal(data.buildMobilePeople(units, new Map())[0].primary.mobileUnitId, 'b');
  assert.equal(units[0].mobileUnitId, 'a');
  const dates = [unit('a', { mobileUserId: 'p', lastSeenAt: '2026-10-14' }), unit('b', { mobileUserId: 'p', lastSeenAt: '2026-10-15' })];
  assert.equal(data.buildMobilePeople(dates, new Map())[0].primary.mobileUnitId, 'b');
});
test('summary emergencies are deduplicated and prefer the current live response', () => {
  const current = session('same', { status: 'active' });
  const merged = data.mergeEmergencySessions([current], [session('same', { status: 'finished' })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'active');
});
test('summary excludes QR sessions and sorts the latest emergencies first', () => {
  const merged = data.mergeEmergencySessions([session('qr', { source: 'frontend', qrId: 'qr' }), session('new', { createdAt: '2026-10-15' })], [session('old', { createdAt: '2026-10-14' })]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].sessionId, 'new');
});
test('GPS actions require finite stored coordinates and preserve valid zero coordinates', () => {
  assert.equal(data.unitMapsUrl(unit('a')), undefined);
  assert.equal(data.unitMapsUrl(unit('a', { lastLocation: { latitude: NaN, longitude: 1 } })), undefined);
  assert.equal(data.unitMapsUrl(unit('a', { lastLocation: { latitude: 0, longitude: 0 } })), 'https://www.google.com/maps?q=0,0');
});
test('all navigation sections round trip and unsupported views fall back safely', () => {
  for (const view of Object.keys(navigation.DASHBOARD_VIEWS)) {
    const href = navigation.dashboardHref(view);
    assert.equal(navigation.getDashboardView(new URL(href, 'http://localhost').searchParams.get('view')), view);
  }
  for (const view of [null, '', '__proto__', 'constructor', 'unknown']) assert.equal(navigation.getDashboardView(view), 'overview');
});
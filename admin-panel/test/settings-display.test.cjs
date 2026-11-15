/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner compiles the pure display helpers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) { const exports = {}; const source = fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8'); vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, Date, Error, Object, Number }); return exports; }
const display = load('settings-display');
const access = load('admin-access');
test('missing health reports remain pending rather than being shown as disconnected', () => {
  assert.equal(display.serviceState(), 'not-reported');
  assert.equal(display.serviceState({}), 'not-reported');
  assert.equal(display.serviceState({ configured: false }), 'not-configured');
  assert.equal(display.serviceState({ connected: false }), 'down');
  assert.equal(display.serviceState({ connected: true }), 'up');
});
test('explicit degraded reports remain visible even with an established connection', () => {
  assert.equal(display.serviceState({ status: 'degraded', connected: true }), 'degraded');
  assert.equal(display.serviceState({ status: 'new-unknown-state' }), 'not-reported');
});
test('service totals keep unavailable, unconfigured and missing reports separate', () => {
  const result = display.serviceTotals(['a', 'b', 'c', 'd', 'e'], { a: { status: 'up' }, b: { status: 'degraded' }, c: { status: 'down' }, d: { configured: false } });
  for (const key of ['up', 'degraded', 'down', 'not-configured', 'not-reported']) assert.equal(result[key], 1);
});
test('connection details omit credentials, query strings and private paths', () => {
  assert.equal(display.safeServiceEndpoint('https://user:secret@host.test:9000/private?token=secret#private'), 'https://host.test:9000');
  assert.equal(display.safeServiceEndpoint('mongodb+srv://user:secret@db.test/private'), 'mongodb+srv://db.test');
  assert.equal(display.safeServiceEndpoint('invalid user:secret@host'), 'Dirección configurada');
  assert.equal(display.safeServiceEndpoint(), null);
});
test('past configured TURN periods are flagged without changing the configured date', () => {
  const now = new Date(2026, 9, 15, 12);
  assert.equal(display.configuredPeriodExpired('2026-07-08', now), true);
  assert.equal(display.configuredPeriodExpired('2026-10-15', now), false);
  assert.equal(display.configuredPeriodExpired('2026-10-16', now), false);
  assert.equal(display.configuredPeriodExpired('invalid', now), false);
  assert.equal(display.configuredPeriodExpired(null, now), false);
});
test('invalid service or history timestamps do not crash a settings card', () => {
  assert.equal(display.formatSettingsDate('invalid'), 'Fecha no disponible');
  assert.equal(display.formatSettingsDate(null), 'Sin registro');
});
test('administration is enabled only for the required permission or superadmin role', () => {
  assert.equal(access.canManageAdminUsers(null), false);
  assert.equal(access.canManageAdminUsers({ role: 'admin', permissions: ['view_sessions'] }), false);
  assert.equal(access.canManageAdminUsers({ role: 'admin', permissions: ['manage_users'] }), true);
  assert.equal(access.canManageAdminUsers({ role: 'superadmin', permissions: [] }), true);
});
test('settings show permission and validation messages in readable form', () => {
  assert.equal(access.settingsErrorMessage(new Error('{"message":"Forbidden resource"}'), 'fallback'), 'Tu cuenta no tiene permiso para realizar esta acción.');
  assert.equal(access.settingsErrorMessage(new access.AdminPermissionError(), 'fallback'), 'Tu cuenta no tiene permiso para realizar esta acción.');
  assert.equal(access.settingsErrorMessage(new Error('{"message":["Revisa el correo","Revisa el usuario"]}'), 'fallback'), 'Revisa el correo. Revisa el usuario');
  assert.equal(access.settingsErrorMessage(new Error('{"message":{"invalid":true}}'), 'fallback'), 'fallback');
  assert.equal(access.settingsErrorMessage(null, 'fallback'), 'fallback');
});
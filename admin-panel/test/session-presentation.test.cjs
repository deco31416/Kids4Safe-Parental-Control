/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner compiles the presentation helpers. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/session-presentation.ts'), 'utf8');
const helpers = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helpers });
test('emergency headlines omit only the trailing mobile unit identifier', () => {
  assert.equal(helpers.emergencyDisplayMessage('Auxilio activo desde Kids4Safe Mobile (mobile-da4c9412-1bd2-4f06-8c39-9bf0c99611f4)'), 'Auxilio activo desde Kids4Safe Mobile');
  assert.equal(helpers.emergencyDisplayMessage('Auxilio desde Ana (contacto familiar)'), 'Auxilio desde Ana (contacto familiar)');
});
test('custom emergency messages remain intact and empty messages have a readable fallback', () => {
  assert.equal(helpers.emergencyDisplayMessage('Necesito ayuda en casa'), 'Necesito ayuda en casa');
  assert.equal(helpers.emergencyDisplayMessage(''), 'Un dispositivo ha solicitado ayuda.');
});
test('event labels translate known capture types without dropping unknown event names', () => {
  assert.equal(helpers.eventDisplayLabel('MOBILE_AUDIO_CAPTURE_RECEIVED'), 'Audio recibido');
  assert.equal(helpers.eventDisplayLabel('MOBILE_SCREEN_CAPTURE_RECEIVED'), 'Captura de pantalla recibida');
  assert.equal(helpers.eventDisplayLabel('NEW_PROVIDER_EVENT'), 'New Provider Event');
});
test('permission states distinguish missing data, denial, consent and actual transmission', () => {
  assert.equal(helpers.permissionDisplayState(undefined), 'unknown');
  assert.equal(helpers.permissionDisplayState(false), 'denied');
  assert.equal(helpers.permissionDisplayState(true), 'granted');
  assert.equal(helpers.permissionDisplayState(false, true), 'live');
});
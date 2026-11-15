/* eslint-disable @typescript-eslint/no-require-imports -- Tests run with Node's CommonJS test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function api(status, response, options = {}) {
  const requests = [], events = [], errors = [], timerDelays = [];
  const storage = new Map(options.noToken ? [] : [
    ['auth_token', 'existing-admin-token'], ['user', '{"id":"test-admin"}'],
    ['admin_authenticated', 'true'], ['admin_token', 'legacy-token'],
  ]);
  const sandbox = { exports: {}, process: { env: { NEXT_PUBLIC_BACKEND_URL: 'http://backend.test' } },
    window: { dispatchEvent(event) { events.push(event); } },
    sessionStorage: { getItem(key) { return storage.get(key) || null; }, removeItem(key) { storage.delete(key); } },
    crypto: { randomUUID() { return 'request-id'; } }, console: { error(...args) { errors.push(args); }, warn() {} },
    Error, TypeError, DOMException, AbortController,
    setTimeout: (callback, delay) => { timerDelays.push(delay); return setTimeout(callback, options.immediateTimers ? 0 : delay); },
    clearTimeout, URL, URLSearchParams, Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    fetch: async (url, requestOptions) => {
      requests.push({ url, options: requestOptions });
      options.onFetch?.(storage);
      if (options.fetchResponse) return options.fetchResponse(url, requestOptions, requests.length);
      return { ok: status < 400, status, text: async () => JSON.stringify(response), json: async () => response };
    },
  };
  const cache = new Map();
  const load = name => {
    if (cache.has(name)) return cache.get(name);
    const source = fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8');
    const result = {};
    cache.set(name, result);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { ...sandbox, exports: result, require: dependency => load(path.basename(dependency)) });
    return result;
  };
  return { AdminAPI: load('admin-api').AdminAPI, fetchAdminResponse: load('admin-request').fetchAdminResponse, requests, events, storage, errors, timerDelays };
}

test('successful session deletion notifies the alarm and retains JWT authentication', async () => {
  const h = api(201, { success: true });
  await h.AdminAPI.killSession('test-session');
  assert.equal(h.requests[0].url, 'http://backend.test/admin/session/test-session/end');
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer existing-admin-token');
  assert.equal(h.requests[0].options.headers['x-api-key'], undefined);
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0].detail.sessionId, 'test-session');
});

test('permission denial preserves the login and never signals deletion', async () => {
  const denied = api(403, { message: 'Forbidden' });
  await assert.rejects(denied.AdminAPI.killSession('test-session'), /no tiene permiso/);
  assert.equal(denied.storage.get('auth_token'), 'existing-admin-token');
  assert.equal(denied.events.length, 0);
});

test('expired login clears credentials once and blocks subsequent polling requests without error logs', async () => {
  const h = api(401, { message: 'Unauthorized' });
  await assert.rejects(h.AdminAPI.getActiveSessionsPage({ limit: 100 }), /sesión venció/);
  assert.equal(h.storage.size, 0);
  assert.deepEqual(h.events.map(e => e.type), ['kids4safe:admin-session-expired']);
  await assert.rejects(h.AdminAPI.getActiveSessionsPage({ limit: 100 }), /sesión venció/);
  assert.equal(h.requests.length, 1);
  assert.equal(h.events.length, 1);
  assert.equal(h.errors.length, 0);
});

test('an unauthenticated tab sends no administrative requests', async () => {
  const h = api(200, {}, { noToken: true });
  await assert.rejects(h.AdminAPI.getActiveSessionsPage({ limit: 100 }), /sesión venció/);
  assert.equal(h.requests.length, 0);
  assert.equal(h.errors.length, 0);
});

test('a late unauthorized response cannot invalidate a newer login', async () => {
  const h = api(401, {}, { onFetch: storage => storage.set('auth_token', 'new-admin-token') });
  await assert.rejects(h.AdminAPI.getActiveSessionsPage({ limit: 100 }), /sesión venció/);
  assert.equal(h.storage.get('auth_token'), 'new-admin-token');
  assert.equal(h.events.length, 0);
});

test('same-origin account APIs also expire the login on unauthorized responses', async () => {
  const h = api(401, { message: 'Unauthorized' });
  await assert.rejects(h.AdminAPI.getAdminUsers(), /sesión venció/);
  assert.equal(h.requests[0].url, '/api/auth/users');
  assert.equal(h.storage.size, 0);
  assert.equal(h.events[0].type, 'kids4safe:admin-session-expired');
});

test('unexpected backend failures remain visible in error logs', async () => {
  const h = api(500, { message: 'Internal error' });
  await assert.rejects(h.AdminAPI.getActiveSessionsPage({ limit: 100 }), /Internal error/);
  assert.equal(h.errors.length, 1);
  assert.equal(h.storage.get('auth_token'), 'existing-admin-token');
});

test('an unsuccessful result cannot dismiss an emergency alert', async () => {
  const h = api(200, { success: false });
  await h.AdminAPI.killSession('test-session');
  assert.equal(h.events.length, 0);
});

test('an interrupted read retries once and recovers with the same JWT', async () => {
  const h = api(200, {}, { immediateTimers: true, fetchResponse: (_url, _options, attempt) => {
    if (attempt === 1) throw new TypeError('Failed to fetch');
    return { ok: true, status: 200, json: async () => ({ success: true, turn: { source: 'env-fallback' } }) };
  } });
  const usage = await h.AdminAPI.getTurnUsage();
  assert.equal(usage.source, 'env-fallback');
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].options.headers.Authorization, 'Bearer existing-admin-token');
  assert.equal(h.errors.length, 0);
  assert.equal(h.events.length, 0);
});

test('persistent connection failures produce a readable error and preserve the login', async () => {
  const h = api(200, {}, { immediateTimers: true, fetchResponse: () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(h.AdminAPI.getQrLinkSubjects({ page: 1, limit: 20 }), /No se pudo conectar con el servidor/);
  assert.equal(h.requests.length, 2);
  assert.equal(h.errors.length, 0);
  assert.equal(h.storage.get('auth_token'), 'existing-admin-token');
});

test('an interrupted mutation is never retried or reported as a successful deletion', async () => {
  const h = api(200, {}, { fetchResponse: () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(h.AdminAPI.killSession('test-session'), /No se pudo conectar con el servidor/);
  assert.equal(h.requests.length, 1);
  assert.equal(h.events.length, 0);
});

test('a stalled request times out after one bounded retry', async () => {
  const h = api(200, {}, { immediateTimers: true, fetchResponse: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }) });
  await assert.rejects(h.AdminAPI.getTurnHistory(6), /tardando demasiado/);
  assert.equal(h.requests.length, 2);
  assert.equal(h.errors.length, 0);
});

test('an explicitly cancelled request is never sent or retried', async () => {
  const h = api(200, {});
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(h.fetchAdminResponse('http://backend.test/admin/turn/usage', { signal: controller.signal }), error => error.name === 'AbortError');
  assert.equal(h.requests.length, 0);
});

test('HTTP errors are not retried as connection failures', async () => {
  const h = api(500, { message: 'Internal error' });
  await assert.rejects(h.AdminAPI.getTurnHistory(6), /Internal error/);
  assert.equal(h.requests.length, 1);
  assert.equal(h.errors.length, 1);
});


test('account APIs explain permission denial without clearing the session', async () => {
 const h = api(403, { message: 'Forbidden resource' });
 await assert.rejects(h.AdminAPI.getAdminUsers(), error => error.name === 'AdminPermissionError' && error.status === 403 && error.message === 'Tu cuenta no tiene permiso para realizar esta acción.');
 assert.equal(h.storage.get('auth_token'), 'existing-admin-token');
 assert.equal(h.events.length, 0);
});
test('system health uses the authenticated request layer', async () => {
 const h = api(200, { services: { apiGateway: { status: 'up' } } });
 const result = await h.AdminAPI.getSystemHealth();
 assert.equal(result.services.apiGateway.status, 'up');
 assert.equal(h.requests[0].url, 'http://backend.test/health/full');
 assert.equal(h.requests[0].options.headers.Authorization, 'Bearer existing-admin-token');
});

test('PDF export uses the current panel JWT, POST and an encoded public session identifier', async () => {
  const h = api(201, { success: true, pdfUrl: '/storage/reports/session.pdf?signature=test' });
  const report = await h.AdminAPI.exportSessionPdf('session/with spaces');
  assert.equal(h.requests[0].url, 'http://backend.test/audit/export-pdf/session%2Fwith%20spaces');
  assert.equal(h.requests[0].options.method, 'POST');
  assert.equal(h.timerDelays[0], 60000);
  assert.equal(h.requests[0].options.timeoutMs, undefined);
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer existing-admin-token');
  assert.equal(report.pdfUrl, 'http://backend.test/storage/reports/session.pdf?signature=test');
});
test('PDF export with an expired session triggers the common login flow without a console error', async () => {
  const h = api(401, { message: 'Unauthorized' });
  await assert.rejects(h.AdminAPI.exportSessionPdf('session-id'), /sesión venció/);
  assert.equal(h.requests.length, 1); assert.equal(h.storage.size, 0);
  assert.equal(h.events[0].type, 'kids4safe:admin-session-expired'); assert.equal(h.errors.length, 0);
});
test('PDF export permission denial preserves the session', async () => {
  const h = api(403, { message: 'Forbidden resource' });
  await assert.rejects(h.AdminAPI.exportSessionPdf('session-id'), /no tiene permiso/);
  assert.equal(h.storage.get('auth_token'), 'existing-admin-token');
  assert.equal(h.errors.length, 0);
});
test('interrupted PDF generation is never submitted twice', async () => {
  const h = api(200, {}, { fetchResponse: () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(h.AdminAPI.exportSessionPdf('session-id'), /No se pudo conectar/);
  assert.equal(h.requests.length, 1);
});
test('PDF export rejects missing files and unsafe download URLs instead of displaying success', async () => {
  for (const response of [{ success: true }, { success: false, pdfUrl: 'https://backend.test/report.pdf' }, { success: true, pdfUrl: 'javascript:alert(1)' }]) {
    const h = api(200, response);
    await assert.rejects(h.AdminAPI.exportSessionPdf('session-id'), /no devolvió|no es válido/);
  }
});

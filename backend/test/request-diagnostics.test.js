const assert = require('node:assert/strict');
const test = require('node:test');

const {
  requestDiagnosticsMiddleware,
} = require('../dist/config/request-diagnostics.middleware.js');

function executeMiddleware(enabled) {
  const previous = process.env.LOG_HTTP_REQUESTS;
  const originalLog = console.log;
  const logs = [];
  process.env.LOG_HTTP_REQUESTS = enabled ? 'true' : 'false';
  console.log = (...values) => logs.push(values);

  try {
    let continued = false;
    requestDiagnosticsMiddleware(
      {
        method: 'POST',
        path: '/auth/login',
        ip: '127.0.0.1',
        headers: {
          authorization: 'Bearer secret-token-that-must-never-be-logged',
          'x-api-key': 'secret-api-key',
        },
      },
      {},
      () => {
        continued = true;
      },
    );
    return { continued, logs };
  } finally {
    console.log = originalLog;
    if (previous === undefined) delete process.env.LOG_HTTP_REQUESTS;
    else process.env.LOG_HTTP_REQUESTS = previous;
  }
}

test('request diagnostics never logs credential contents', () => {
  const result = executeMiddleware(true);
  const serialized = JSON.stringify(result.logs);

  assert.equal(result.continued, true);
  assert.equal(result.logs.length, 1);
  assert.match(serialized, /present/);
  assert.doesNotMatch(serialized, /secret-token|secret-api-key|Bearer/);
});

test('request diagnostics stays silent by default', () => {
  const result = executeMiddleware(false);

  assert.equal(result.continued, true);
  assert.equal(result.logs.length, 0);
});

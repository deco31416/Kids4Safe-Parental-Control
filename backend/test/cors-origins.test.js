const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getAllowedCorsOrigins,
  validateCorsOrigin,
} = require('../dist/config/cors-origins.js');

const managedKeys = [
  'BACKEND_PUBLIC_URL',
  'REALTIME_URL',
  'CORS_ORIGIN',
];

function withEnvironment(values, action) {
  const previous = Object.fromEntries(
    managedKeys.map((key) => [key, process.env[key]]),
  );

  try {
    for (const key of managedKeys) delete process.env[key];
    Object.assign(process.env, values);
    return action();
  } finally {
    for (const key of managedKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('allows the configured backend and realtime origins', () => {
  withEnvironment(
    {
      BACKEND_PUBLIC_URL: 'https://backend.example.com/',
      REALTIME_URL: 'https://realtime.example.com',
    },
    () => {
      const origins = getAllowedCorsOrigins();
      assert.ok(origins.includes('https://backend.example.com'));
      assert.ok(origins.includes('https://realtime.example.com'));

      validateCorsOrigin('https://backend.example.com', (error, allowed) => {
        assert.equal(error, null);
        assert.equal(allowed, true);
      });
    },
  );
});

test('deduplicates origins and rejects unknown origins', () => {
  withEnvironment(
    {
      BACKEND_PUBLIC_URL: 'https://backend.example.com',
      REALTIME_URL: 'https://backend.example.com/',
      CORS_ORIGIN: 'https://backend.example.com',
    },
    () => {
      const matches = getAllowedCorsOrigins().filter(
        (origin) => origin === 'https://backend.example.com',
      );
      assert.equal(matches.length, 1);

      validateCorsOrigin('https://unknown.example.com', (error, allowed) => {
        assert.match(error?.message || '', /Origen CORS no permitido/);
        assert.equal(allowed, false);
      });
    },
  );
});

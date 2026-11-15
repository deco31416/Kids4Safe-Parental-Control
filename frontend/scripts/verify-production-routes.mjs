import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const outputRoot = new URL('../.next/server/app/', import.meta.url);
const metadata = JSON.parse(
  await readFile(new URL('test-permissions.meta', outputRoot), 'utf8'),
);
const html = await readFile(
  new URL('test-permissions.html', outputRoot),
  'utf8',
);

assert.equal(metadata.status, 404, 'test-permissions must return 404 in production');
assert.match(html, /No encontramos esta página\./);
assert.doesNotMatch(html, /Sistema de Permisos/);

console.log('production route security tests: 3/3 passed');

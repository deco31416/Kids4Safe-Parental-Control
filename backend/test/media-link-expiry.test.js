const assert = require('node:assert/strict');
const test = require('node:test');
const { createHmac } = require('node:crypto');
const { firstValueFrom, of } = require('rxjs');
const { StorageUrlService } = require('../dist/storage/storage-url.service');
const { MediaLinksInterceptor } = require('../dist/storage/media-links.interceptor');

const secret = 'm'.repeat(48);
function service() {
  return new StorageUrlService({ get: (name) => ({ JWT_SECRET: secret, BACKEND_PUBLIC_URL: 'http://localhost:7000', MEDIA_URL_TTL_SECONDS: 60 })[name] });
}
function verify(urls, value, route = 'media') {
  const url = new URL(value);
  return urls.verify(url.pathname.split('/').at(-1), url.searchParams.get('signature'), url.searchParams.get('expires'), route);
}

test('media URLs expire and bind the storage key, timestamp and route into the signature', (t) => {
  const original = Date.now;
  let now = original();
  Date.now = () => now;
  t.after(() => { Date.now = original; });
  const urls = service();
  const key = 'sessions/own/audio/clip.webm';
  const link = urls.create(key);
  assert.equal(verify(urls, link), key);
  assert.throws(() => verify(urls, link, 'screen-media'));
  const changed = new URL(link);
  changed.searchParams.set('expires', String(Math.floor(now / 1000) + 600));
  assert.throws(() => verify(urls, changed.href));
  now += 61000;
  assert.throws(() => verify(urls, link));
  const fresh = urls.refresh(link);
  assert.equal(verify(urls, fresh), key);
  assert.notEqual(fresh, link);
});

test('legacy stored URLs renew only through an authorized response, never through public media verification', async () => {
  const urls = service();
  const token = Buffer.from('own/frame.jpg').toString('base64url');
  const signature = createHmac('sha256', secret).update(token).digest('base64url');
  const legacy = `http://localhost:7000/screen-media/${token}?signature=${signature}`;
  assert.throws(() => urls.verify(token, signature));
  const interceptor = new MediaLinksInterceptor(urls);
  const body = { nested: [{ thumbnailUrl: legacy }], createdAt: new Date() };
  const context = (user) => ({ getType: () => 'http', switchToHttp: () => ({ getRequest: () => ({ user }) }) });
  const result = await firstValueFrom(interceptor.intercept(context({ role: 'admin', permissions: ['view_sessions'] }), { handle: () => of(body) }));
  assert.equal(verify(urls, result.nested[0].thumbnailUrl, 'screen-media'), 'own/frame.jpg');
  assert.equal(result.createdAt, body.createdAt);
  const publicResult = await firstValueFrom(interceptor.intercept(context(undefined), { handle: () => of(body) }));
  assert.equal(publicResult.nested[0].thumbnailUrl, legacy);
  const mobileResult = await firstValueFrom(interceptor.intercept(context({ mobileUserId: 'user' }), { handle: () => of(body) }));
  assert.equal(mobileResult.nested[0].thumbnailUrl, legacy);
  const forged = legacy.replace(signature, 'forged');
  assert.equal(urls.refresh(forged), forged);
});

test('media signing fails closed without a strong secret', () => {
  assert.throws(() => new StorageUrlService({ get: () => undefined }));
});

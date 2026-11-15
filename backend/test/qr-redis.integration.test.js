const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { QRService } = require('../dist/qr/qr.service');

test('real Redis atomically enforces maxUses without corrupting QR configuration', { skip: !process.env.SECURITY_TEST_REDIS_URL }, async (t) => {
  const values = { REDIS_URL: process.env.SECURITY_TEST_REDIS_URL, REDIS_KEY_PREFIX: `security-test:${randomUUID()}:` };
  const qr = new QRService({ get: (key) => values[key] }, {});
  let record;
  t.after(async () => {
    if (record) {
      // Remove only this test's member, never delete the shared index itself.
      await qr.redis.srem('qr:all', record.id);
      await qr.redis.del(`qr:${record.id}`);
    }
    await qr.redis.quit();
  });
  record = await qr.create('security-test', 'test', { redirect_url: 'https://example.org' }, { maxUses: 1, permissionsRequired: [] });
  const attempts = await Promise.allSettled(Array.from({ length: 40 }, () => qr.reserveScan(record.id)));
  assert.equal(attempts.filter((item) => item.status === 'fulfilled').length, 1);
  for (const result of attempts.filter((item) => item.status === 'rejected')) assert.equal(result.reason.getStatus(), 403);
  const saved = await qr.get(record.id);
  assert.equal(saved.totalScans, 1);
  assert.deepEqual(saved.policies.permissionsRequired, []);
  await qr.update(record.id, { ...record, name: 'edited', totalScans: 0 });
  assert.equal((await qr.get(record.id)).totalScans, 1);
});

const assert = require('node:assert/strict');
const test = require('node:test');
const { AdminController } = require('../dist/admin/admin.controller');

test('admin deletion remains idempotent when the session record is already missing', async () => {
  const auditEvents = [];
  const controller = new AdminController(
    {},
    {},
    {
      complete: async () => { throw new Error('Session not found'); },
      deleteSessionRecord: async () => 0,
    },
    { log: async (event) => { auditEvents.push(event); } },
    { closeSessionRooms: async () => undefined },
    {},
    { deleteSessionScreenshots: async () => 0 },
    { deleteSessionAudioClips: async () => 0 },
    { deleteSessionHistory: async () => 0 },
    { deleteSession: async () => ({ deletedCount: 0 }) },
    { clearBuffers: () => undefined },
    { deleteRoute: async () => 0 },
  );

  const result = await controller.endSessionAsAdmin('missing-session');

  assert.equal(result.success, true);
  assert.equal(result.status, 'deleted');
  assert.deepEqual(result.deleted, { screenshots: 0, audioClips: 0, locations: 0, sessions: 0, recordings: 0 });
  assert.equal(auditEvents[0].metadata.sessionAlreadyMissing, true);
});

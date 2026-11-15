const assert = require('node:assert/strict');
const test = require('node:test');
const { serializeAdminNotification } = require('../dist/notification/admin-notification.presenter');

test('admin notifications expose the stable panel contract', () => {
  const createdAt = new Date('2026-08-20T00:00:00.000Z');
  const result = serializeAdminNotification({
    _id: { toString: () => 'notification-1' },
    adminType: 'session_started',
    adminMessage: 'Sesión iniciada',
    sessionId: 'session-1',
    isRead: false,
    createdAt,
  });

  assert.equal(result.id, 'notification-1');
  assert.equal(result.type, 'session_started');
  assert.equal(result.message, 'Sesión iniciada');
  assert.equal(result.sessionId, 'session-1');
  assert.equal(result.isRead, false);
  assert.equal(result.createdAt, createdAt);
});

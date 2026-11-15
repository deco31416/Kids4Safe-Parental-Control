const assert = require('node:assert/strict');
const test = require('node:test');
const { NotificationService } = require('../dist/notification/notification.service.js');

function createService(notification) {
  const notificationModel = {
    findOne: () => Promise.resolve(notification),
  };
  return new NotificationService(notificationModel, {}, {}, {}, {});
}

test('service reactivation keeps only requested targets and records consent', async () => {
  let saved = false;
  const notification = {
    expiresAt: new Date(Date.now() + 60_000),
    reactivateTargets: ['camera', 'location'],
    reactivateTunnel: true,
    responses: [{ sessionId: 'session-1', decision: 'rejected' }],
    seenBy: [],
    save: async () => { saved = true; },
  };
  const service = createService(notification);
  const result = await service.respondToPush(
    'notification-1',
    'session-1',
    'accepted',
    ['camera', 'microphone'],
  );

  assert.equal(result.expired, false);
  assert.equal(saved, true);
  assert.deepEqual(notification.seenBy, ['session-1']);
  assert.equal(notification.responses.length, 1);
  assert.equal(notification.responses[0].decision, 'accepted');
  assert.deepEqual(notification.responses[0].targets, ['camera']);
});

test('expired reactivation cannot be accepted or persisted', async () => {
  let saved = false;
  const notification = {
    expiresAt: new Date(Date.now() - 1),
    reactivateTargets: ['camera'],
    reactivateTunnel: true,
    responses: [],
    seenBy: [],
    save: async () => { saved = true; },
  };
  const result = await createService(notification).respondToPush(
    'notification-1',
    'session-1',
    'accepted',
    ['camera'],
  );

  assert.equal(result.expired, true);
  assert.equal(saved, false);
  assert.deepEqual(notification.responses, []);
});

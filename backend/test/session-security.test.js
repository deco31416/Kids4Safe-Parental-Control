const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const { JwtService } = require('@nestjs/jwt');
const { AuthService } = require('../dist/auth/auth.service');
const { JwtStrategy } = require('../dist/auth/strategies/jwt.strategy');
const { LiveController } = require('../dist/live/live.controller');
const { LiveService } = require('../dist/live/live.service');
const { LiveSessionGuard } = require('../dist/live/live-session.guard');
const { SessionService } = require('../dist/session/session.service');
const { AudioRecordingsController } = require('../dist/recordings/audio-recordings.controller');
const { AudioRecordingService } = require('../dist/recordings/audio-recording.service');
const { StreamGateway } = require('../dist/stream/stream.gateway');
const { RealtimeGateway } = require('../dist/realtime/realtime.gateway');
const { AdminController } = require('../dist/admin/admin.controller');
const { QRService } = require('../dist/qr/qr.service');
const { MobileAuthService } = require('../dist/mobile-auth/mobile-auth.service');
const { NotificationService } = require('../dist/notification/notification.service');

function socket(id, auth = {}) {
  return { id, handshake: { auth, headers: {} }, data: {}, events: [], disconnected: false,
    join() {}, leave() {}, emit(...args) { this.events.push(args); },
    disconnect() { this.disconnected = true; } };
}

test('HTTP live and audio routes enforce scoped tokens without requiring an admin JWT', async (t) => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'x'.repeat(48);
  t.after(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
  const writes = [];
  const sessions = {
    validatePublisherSessionToken: async (id, token) => id === 'web-session' && token === 'publisher',
    getActiveMobileSession: async (id, token) => id === 'mobile-session' && token === 'mobile' ? { qrId: 'qr' } : null,
    get: async () => ({ qrId: 'qr' }),
  };
  const live = Object.fromEntries(['Consent', 'DeviceInfo', 'LocationRealtime', 'Orientation', 'Motion', 'DestinationOpened']
    .map((name) => [`handle${name}`, async (body) => { writes.push(body); return { ok: true }; }]));
  const audio = { processAudioChunk: async (body) => { writes.push(body); }, finishRecording: async () => 'saved', getBufferStats: () => ({}) };
  const module = await Test.createTestingModule({
    controllers: [LiveController, AudioRecordingsController],
    providers: [LiveSessionGuard, JwtStrategy,
      { provide: LiveService, useValue: live }, { provide: SessionService, useValue: sessions },
      { provide: AudioRecordingService, useValue: audio },
      { provide: AuthService, useValue: { resolveAdminIdentity: async () => { throw new Error('Invalid'); } } }],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const base = await app.getUrl();
  const post = (route, body, headers = {}) => fetch(`${base}${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  for (const route of ['consent', 'device-info', 'location/realtime', 'orientation', 'motion', 'destination-opened']) {
    assert.equal((await post(`/live/${route}`, { sessionId: 'web-session', qrId: 'qr' })).status, 401);
  }
  assert.equal(writes.length, 0);
  assert.equal((await post('/live/consent', { sessionId: 'web-session', qrId: 'other' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 403);
  assert.equal((await post('/live/device-info', { sessionId: 'other-session' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 401);
  assert.equal((await post('/live/consent', { sessionId: 'web-session', qrId: 'qr' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 201);
  assert.equal((await post('/live/device-info', { sessionId: 'mobile-session' }, { 'X-Mobile-Session-Token': 'mobile' })).status, 201);
  assert.equal((await post('/recordings/audio/chunk', { sessionId: 'web-session', qrId: 'qr', audioData: 'YQ==' })).status, 401);
  assert.equal((await post('/recordings/audio/chunk', { sessionId: 'web-session', qrId: 'other' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 403);
  assert.equal((await post('/recordings/audio/chunk', { sessionId: 'web-session', qrId: 'qr', audioData: 'YQ==' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 201);
  assert.equal((await post('/recordings/audio/finish', { sessionId: 'web-session', qrId: 'qr' }, { 'X-Publisher-Session-Token': 'publisher' })).status, 201);
  assert.equal((await fetch(`${base}/recordings/audio/stats`)).status, 401);
  assert.equal(writes.length, 3);
});

test('HTTP, WebRTC and websocket identities use current database privileges and active status', async () => {
  const jwt = new JwtService({ secret: 's'.repeat(48) });
  const user = { username: 'current', role: 'admin', permissions: ['view_sessions'], isActive: true };
  const auth = new AuthService({ findById: async () => user }, jwt, {});
  const token = jwt.sign({ sub: '507f1f77bcf86cd799439011', username: 'old', role: 'superadmin', permissions: ['manage_sessions'] });
  assert.deepEqual(await auth.verifyAdminToken(token, 'view_sessions'), {
    userId: '507f1f77bcf86cd799439011', username: 'current', role: 'admin', permissions: ['view_sessions'],
  });
  user.permissions = [];
  await assert.rejects(auth.verifyAdminToken(token, 'view_sessions'));
  user.tokenVersion = 1;
  await assert.rejects(auth.verifyAdminToken(token));
  user.tokenVersion = 0;
  user.isActive = false;
  await assert.rejects(auth.verifyAdminToken(token));
  await assert.rejects(auth.resolveAdminIdentity({ sub: '507f1f77bcf86cd799439011', type: 'mobile-user' }));
});

test('legacy streaming rejects session IDs alone and cross-session or viewer publication', async () => {
  const sessions = {
    validatePublisherSessionToken: async (id, token) => id === 'own' && token === 'valid',
    getActiveMobileSession: async () => null,
  };
  const auth = { verifyAdminToken: async (token) => { if (token !== 'admin') throw new Error('invalid'); return { username: 'viewer', role: 'admin' }; } };
  const gateway = new StreamGateway(sessions, auth);
  const broadcasts = [];
  gateway.server = { to: (room) => ({ emit: (...args) => broadcasts.push({ room, args }) }) };
  const forged = socket('forged', { sessionId: 'own' });
  await gateway.handleConnection(forged);
  assert.equal(forged.disconnected, true);
  await assert.rejects(gateway.handleGpsUpdate({ sessionId: 'victim' }, forged));
  const publisher = socket('publisher', { sessionId: 'own', publisherToken: 'valid' });
  await gateway.handleConnection(publisher);
  await gateway.handleJoinSession({ sessionId: 'own' }, publisher);
  await assert.rejects(gateway.handleCameraStream({ sessionId: 'victim', frame: 'fake' }, publisher));
  await gateway.handleGpsUpdate({ sessionId: 'own', location: { lat: 4 } }, publisher);
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].room, 'session-own');
  const viewer = socket('viewer', { token: 'admin' });
  await gateway.handleConnection(viewer);
  await gateway.handleJoinSession({ sessionId: 'own' }, viewer);
  await assert.rejects(gateway.handleAudioStream({ sessionId: 'own', chunk: 'fake' }, viewer));
});

test('revoked realtime viewers cannot negotiate and are disconnected during revalidation', async () => {
  let allowed = true;
  const auth = { verifyAdminToken: async () => { if (!allowed) throw new Error('revoked'); return {}; } };
  const gateway = new RealtimeGateway({}, {}, {}, {}, {}, auth);
  const viewer = socket('viewer', { token: 'signed' });
  gateway.server = { sockets: new Map([['viewer', viewer]]), to: () => ({ emit() {} }) };
  await gateway.handleJoinSession(viewer, { sessionId: 'own', role: 'viewer' });
  assert.equal(viewer.events.at(-1)[0], 'joined');
  allowed = false;
  await gateway.handleWebRTCStart(viewer, { sessionId: 'own' });
  assert.equal(viewer.events.at(-1)[0], 'error');
  await gateway.revalidateViewers();
  assert.equal(viewer.disconnected, true);
});

test('concurrent one-time QR joins admit exactly one reservation and preserve empty permission arrays', async () => {
  let raw = JSON.stringify({ id: 'qr', isActive: true, totalScans: 0, activeSessions: 0, policies: { maxUses: 1, permissionsRequired: [] } });
  const service = Object.create(QRService.prototype);
  service.redis = {
    get: async () => raw,
    eval: async (_script, _count, _key, before, after) => { if (before !== raw) return 0; raw = after; return 1; },
  };
  const results = await Promise.allSettled(Array.from({ length: 30 }, () => service.reserveScan('qr')));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(JSON.parse(raw).totalScans, 1);
  assert.deepEqual(JSON.parse(raw).policies.permissionsRequired, []);
  await service.update('qr', { totalScans: 0, activeSessions: 999, name: 'renamed' });
  assert.equal(JSON.parse(raw).totalScans, 1);
  assert.equal(JSON.parse(raw).activeSessions, 0);
  await service.releaseScan('qr');
  assert.equal(JSON.parse(raw).totalScans, 0);
});

test('session deletion removes continuous recordings and clears unflushed audio', async () => {
  const calls = [];
  const controller = new AdminController({}, {},
    { complete: async () => ({ qrId: 'qr' }), deleteSessionRecord: async () => 1 },
    { log: async () => {} }, { closeSessionRooms: async () => {} }, {},
    { deleteSessionScreenshots: async () => 1 }, { deleteSessionAudioClips: async () => 2 },
    { deleteSessionHistory: async () => 3 },
    { deleteSession: async (id) => { calls.push(['recordings', id]); return { deletedCount: 4 }; } },
    { clearBuffers: (id) => calls.push(['buffers', id]) },
    { deleteRoute: async () => 5 });
  const result = await controller.endSessionAsAdmin('own');
  assert.equal(result.deleted.recordings, 4);
  assert.equal(result.deleted.locations, 8);
  assert.deepEqual(calls, [['buffers', 'own'], ['recordings', 'own']]);
});

test('password recovery never exposes its account takeover token in public responses', async () => {
  const user = { _id: 'mobile-test', save: async () => {} };
  const model = { findOne: () => ({ select: () => ({ exec: async () => user }) }) };
  const auth = new MobileAuthService(model, {}, {}, {}, { log: async () => {} });
  const response = await auth.forgotPassword({ email: 'test@example.org' });
  assert.equal(response.success, true);
  assert.equal(Object.hasOwn(response, 'resetToken'), false);
  assert.match(user.passwordResetTokenHash, /^[a-f0-9]{64}$/);
  assert.ok(user.passwordResetExpiresAt > new Date());
});

test('administrative notifications broadcast only to authenticated administrators', async () => {
  const sent = [];
  const model = { create: async (data) => ({ ...data, _id: 'notification' }) };
  const gateway = { server: { to: (room) => ({ emit: (event) => sent.push({ room, event }) }) } };
  const notifications = new NotificationService(model, {}, {}, gateway, {}, {});
  await notifications.createAdminNotification('test', 'test');
  assert.deepEqual(sent, [{ room: RealtimeGateway.ADMIN_NOTIFICATIONS_ROOM, event: 'admin-notification' }]);
});

test('notification-only administrator sockets are also disconnected after account revocation', async () => {
  let active = true;
  const auth = { verifyAdminToken: async () => { if (!active) throw new Error('inactive'); return {}; } };
  const gateway = new RealtimeGateway({}, {}, {}, {}, {}, auth);
  const admin = socket('alerts', { token: 'signed' });
  const rooms = [];
  admin.join = (room) => rooms.push(room);
  gateway.server = { sockets: new Map([['alerts', admin]]) };
  await gateway.handleConnection(admin);
  assert.deepEqual(rooms, [RealtimeGateway.ADMIN_NOTIFICATIONS_ROOM]);
  active = false;
  await gateway.revalidateViewers();
  assert.equal(admin.disconnected, true);
});

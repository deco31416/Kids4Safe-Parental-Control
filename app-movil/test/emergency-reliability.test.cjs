const assert = require('node:assert/strict');
const test = require('node:test');
const { createLoader, memoryStorage } = require('./helpers/load-source.cjs');

function fixture(storage = memoryStorage(), platform = 'web') {
  const state = { heartbeatError: null, endError: null, permissionError: null, preferences: { camera: false, microphone: false, location: false, screen: false, notifications: false, bluetooth: false } };
  const counts = { created: 0, end: 0, camera: 0, microphone: 0, realtime: 0, stopped: 0 };
  const join = { sessionId: 'session-test', mobileSessionToken: 'mock-token', qrId: 'qr-test', destinationUrl: 'https://example.test', qrName: 'Test', policy: {} };
  const granted = async () => ({ granted: true });
  const api = new Proxy({
    startMobileEmergency: async () => { counts.created++; return join; },
    end: async () => { counts.end++; if (state.endError) throw state.endError; },
    heartbeat: async () => { if (state.heartbeatError) throw state.heartbeatError; }
  }, { get: (obj, key) => obj[key] || (async () => ({})) });
  const loader = createLoader({
    'react-native': { Platform: { OS: platform }, AppState: { currentState: 'active' }, Linking: {} },
    'expo-secure-store': { getItemAsync: async (key) => storage.getItem(key), setItemAsync: async (key, value) => storage.setItem(key, value), deleteItemAsync: async (key) => storage.removeItem(key) },
    'expo-camera': { Camera: {
      getCameraPermissionsAsync: granted, getMicrophonePermissionsAsync: granted,
      requestCameraPermissionsAsync: async () => { counts.camera++; if (state.permissionError) throw state.permissionError; return { granted: true }; }
    } },
    'expo-audio': { requestRecordingPermissionsAsync: async () => { counts.microphone++; return { granted: true }; } },
    'expo-constants': { default: { expoConfig: { version: 'test' } } },
    'expo-notifications': { getPermissionsAsync: granted, requestPermissionsAsync: granted },
    'expo-location': { getForegroundPermissionsAsync: granted, requestForegroundPermissionsAsync: granted, getBackgroundPermissionsAsync: async () => ({ granted: false }), Accuracy: { High: 1 }, getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0 } }), watchPositionAsync: async () => ({ remove() {} }) },
    'src/api/session.api.ts': { sessionApi: api },
    'src/utils/securityPermissionStorage.ts': { securityPermissionStorage: { getItem: async () => ({ ...state.preferences }) } },
    'src/utils/mobileUnitStorage.ts': { mobileUnitStorage: { getOrCreate: async () => 'mobile-test-unit' } },
    'src/services/mobileInstallation.service.ts': { mobileInstallationService: { register: async () => ({ unitId: 'mobile-test-unit', unitToken: 'mock-unit-token' }) } },
    'src/services/mobileAudio.service.ts': { mobileAudioService: { start() {}, stop: async () => { counts.stopped++; } } },
    'src/services/mobileBackgroundLocation.service.ts': { mobileBackgroundLocationService: { start: async () => false, stop: async () => {} } },
    'src/services/mobileRealtimePublisher.service.ts': { mobileRealtimePublisherService: { start: async () => { counts.realtime++; return true; }, stop() {}, prepareScreenShare: async () => false, isScreenSharePrepared: () => false } },
    'src/services/mobileSensors.service.ts': { mobileSensorsService: { start() {}, stop() {} } }
  }, { localStorage: storage });
  const service = loader.load('src/services/mobilePublisher.service.ts').mobilePublisherService;
  const sessions = loader.load('src/utils/activeMobileSessionStorage.ts').activeMobileSessionStorage;
  const queue = loader.load('src/utils/pendingSessionClosuresStorage.ts').pendingSessionClosuresStorage;
  const closures = loader.load('src/services/mobileSessionClosure.service.ts').mobileSessionClosureService;
  return { service, sessions, queue, closures, join, counts, state, storage,
    seed: () => sessions.setItem({ ...join, permissions: { camera: false, microphone: false, location: false } }) };
}

for (const [name, error] of [['sin red', new Error('Network Error')], ['con servidor 503', { response: { status: 503 } }]]) {
  test(`recuperar Auxilio ${name} conserva la sesión y permite retomarla después`, async () => {
    const f = fixture(); await f.seed();
    f.state.heartbeatError = error;
    await assert.rejects(f.service.recoverActiveSession());
    assert.equal((await f.sessions.getItem()).sessionId, f.join.sessionId);
    assert.equal(f.counts.realtime, 0);
    f.state.heartbeatError = null;
    assert.equal((await f.service.recoverActiveSession()).sessionId, f.join.sessionId);
    assert.equal(f.counts.camera + f.counts.microphone, 0);
  });
}

test('una sesión que el servidor devuelve como inexistente sí se elimina', async () => {
  const f = fixture(); await f.seed(); f.state.heartbeatError = { response: { status: 404 } };
  assert.equal(await f.service.recoverActiveSession(), null);
  assert.equal(await f.sessions.getItem(), null);
});

test('Auxilio manual respeta cámara y micrófono apagados aunque el SO los permita', async () => {
  const f = fixture(); const session = await f.service.startEmergency();
  assert.equal(session.permissions.camera, false); assert.equal(session.permissions.microphone, false);
  assert.equal(f.counts.camera + f.counts.microphone, 0);
});

test('Auxilio usa los permisos activados por el usuario', async () => {
  const f = fixture(); f.state.preferences.camera = true; f.state.preferences.microphone = true;
  const session = await f.service.startEmergency();
  assert.equal(session.permissions.camera, true); assert.equal(session.permissions.microphone, true);
  assert.equal(f.counts.camera, 1); assert.equal(f.counts.microphone, 1);
});

test('una reactivación explícita habilita solo sus objetivos', async () => {
  const f = fixture(); f.state.preferences.microphone = true;
  const session = await f.service.startEmergency({ reactivateTargets: ['camera'] });
  assert.equal(session.permissions.camera, true); assert.equal(session.permissions.microphone, false);
});

test('si falla la consulta de permisos se compensa la alerta ya creada', async () => {
  const f = fixture(); f.state.preferences.camera = true; f.state.permissionError = new Error('Permiso no disponible');
  await assert.rejects(f.service.startEmergency(), /permisos nativos/);
  assert.equal(f.counts.created, 1); assert.equal(f.counts.end, 1);
  assert.equal(await f.sessions.getItem(), null); assert.equal((await f.queue.getItems()).length, 0);
});

test('si la compensación falla queda un cierre durable y no se retoma esa alerta', async () => {
  const f = fixture(); f.state.preferences.camera = true; f.state.permissionError = new Error('Permiso no disponible'); f.state.endError = { response: { status: 503 } };
  await assert.rejects(f.service.startEmergency(), /permisos nativos/);
  assert.equal((await f.queue.getItems()).length, 1);
  const restarted = fixture(f.storage);
  assert.equal(await restarted.service.recoverActiveSession(), null);
  assert.equal(restarted.counts.realtime, 0);
  assert.equal((await restarted.closures.flush()).pending, 0);
});

test('Detener con 503 apaga recursos, informa pendiente y reintenta después de reiniciar', async () => {
  const f = fixture(); await f.seed(); f.state.endError = { response: { status: 503 } };
  assert.equal((await f.service.stop(f.join.sessionId, f.join.mobileSessionToken)).pendingClosure, true);
  assert.ok(f.counts.stopped > 0); assert.equal(await f.sessions.getItem(), null);
  const restarted = fixture(f.storage);
  assert.equal((await restarted.queue.getItems()).length, 1);
  const result = await restarted.closures.flush();
  assert.equal(result.confirmed, 1); assert.equal(result.pending, 0); assert.equal(restarted.counts.end, 1);
});

test('un cierre ya inexistente se confirma; un 403 mantiene el cierre pendiente', async () => {
  for (const status of [404, 403]) {
    const f = fixture(); await f.seed(); f.state.endError = { response: { status } };
    assert.equal((await f.service.stop(f.join.sessionId, f.join.mobileSessionToken)).pendingClosure, status === 403);
  }
});

test('un cierre interrumpido entre guardar intención y limpiar sesión nunca se recupera', async () => {
  const f = fixture(); await f.seed();
  await f.queue.add({ sessionId: f.join.sessionId, mobileSessionToken: f.join.mobileSessionToken, requestedAt: Date.now() });
  assert.equal(await f.service.recoverActiveSession(), null);
  await f.closures.flush();
  assert.equal(await f.sessions.getItem(), null);
});

test('cerrar una sesión anterior no borra la nueva sesión activa', async () => {
  const f = fixture(); await f.seed();
  await f.queue.add({ sessionId: 'old-session', requestedAt: Date.now() });
  await f.closures.flush();
  assert.equal((await f.sessions.getItem()).sessionId, f.join.sessionId);
});

test('la cola conserva varias solicitudes concurrentes sin perder cierres', async () => {
  const f = fixture();
  await Promise.all(['a', 'b', 'c'].map((sessionId) => f.queue.add({ sessionId, requestedAt: 1 })));
  assert.equal((await f.queue.getItems()).length, 3);
  const first = f.closures.flush(); const second = f.closures.flush();
  assert.equal(first, second); await first;
  assert.equal((await f.queue.getItems()).length, 0);
});

test('sin almacenamiento y sin backend no se comunica un cierre exitoso', async () => {
  const f = fixture(); await f.seed(); f.state.endError = new Error('offline');
  const original = f.storage.setItem;
  f.storage.setItem = (key, value) => { if (key.includes('pending_session_closures')) throw new Error('Storage full'); return original(key, value); };
  await assert.rejects(f.service.stop(f.join.sessionId, f.join.mobileSessionToken), /guardar el cierre/);
  assert.equal(f.counts.end, 1); assert.ok(await f.sessions.getItem());
});

test('el cierre pendiente también persiste mediante SecureStore en móvil', async () => {
  const f = fixture(memoryStorage(), 'android'); await f.seed(); f.state.endError = new Error('offline');
  assert.equal((await f.service.stop(f.join.sessionId, f.join.mobileSessionToken)).pendingClosure, true);
  const restarted = fixture(f.storage, 'android');
  assert.equal((await restarted.queue.getItems()).length, 1);
  assert.equal((await restarted.closures.flush()).confirmed, 1);
});

test('la limpieza concurrente del cierre anterior no elimina una sesión nueva', async () => {
  const f = fixture(); await f.seed();
  await Promise.all([
    f.sessions.removeIfMatches(f.join.sessionId),
    f.sessions.setItem({ ...f.join, sessionId: 'new-session', permissions: { camera: false, microphone: false, location: false } })
  ]);
  assert.equal((await f.sessions.getItem()).sessionId, 'new-session');
});

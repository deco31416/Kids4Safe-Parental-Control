const assert = require('node:assert/strict');
const test = require('node:test');
const { createLoader } = require('./helpers/load-source.cjs');

function fixture(cameraGetter = async () => ({ granted: false })) {
  const states = []; const refs = []; const effects = [];
  let stateIndex = 0; let refIndex = 0; let microphoneQueries = 0;
  const react = {
    useState(initial) { const i = stateIndex++; states[i] = initial; return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(value) { const i = refIndex++; refs[i] = { current: value }; return refs[i]; },
    useCallback: (callback) => callback,
    useEffect: (callback) => effects.push(callback)
  };
  const loader = createLoader({
    'react': react,
    'react-native': { Platform: { OS: 'web' } },
    'expo-camera': { Camera: { getCameraPermissionsAsync: cameraGetter, getMicrophonePermissionsAsync: async () => { microphoneQueries++; return { granted: false }; } } },
    'expo-location': { getForegroundPermissionsAsync: async () => ({ granted: false }) },
    'expo-notifications': {},
    'src/api/client.ts': { hasApiBaseUrl: true },
    'src/services/mobileInstallation.service.ts': { mobileInstallationService: { getStatus: () => ({ registered: true, notificationConfigured: false }) } },
    'src/utils/mobileUnitTokenStorage.ts': { mobileUnitTokenStorage: { getItem: async () => 'mock-token' } }
  });
  const hook = loader.load('src/hooks/useDeviceReadiness.ts').useDeviceReadiness();
  return { hook, loader, states, effects, microphoneQueries: () => microphoneQueries };
}

test('el diagnóstico consulta permisos sin invocar solicitudes del micrófono', async () => {
  const f = fixture(); await f.hook.verify();
  assert.equal(f.microphoneQueries(), 1); assert.equal(f.states[1], false);
  assert.equal(f.states[0].microphone, false); assert.equal(f.states[0].unitRegistered, true);
});

test('una API que no responde libera Verificando y permite reintentar', async () => {
  let resolve; let hanging = true;
  const f = fixture(() => hanging ? new Promise((done) => { resolve = done; }) : Promise.resolve({ granted: true }));
  const pending = f.hook.verify(); assert.equal(f.states[1], true);
  f.loader.runTimeouts(); await pending;
  assert.equal(f.states[1], false); assert.match(f.states[0].error, /tardando/);
  resolve({ granted: true }); await Promise.resolve();
  assert.equal(f.states[0].camera, false);
  hanging = false; await f.hook.verify();
  assert.equal(f.states[0].camera, true); assert.equal(f.states[0].error, undefined);
});

test('un resultado antiguo no reemplaza una verificación más reciente', async () => {
  let firstResolve; let calls = 0;
  const f = fixture(() => ++calls === 1 ? new Promise((done) => { firstResolve = done; }) : Promise.resolve({ granted: true }));
  const first = f.hook.verify(); await f.hook.verify();
  firstResolve({ granted: false }); await first;
  assert.equal(f.states[0].camera, true); assert.equal(f.states[1], false);
});

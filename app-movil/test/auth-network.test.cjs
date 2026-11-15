const assert = require('node:assert/strict');
const test = require('node:test');
const { createLoader } = require('./helpers/load-source.cjs');

function fixture() {
  const state = { token: 'saved-token', meError: null, me: null, deleted: 0 };
  const user = { id: 'user-test', name: 'Persona de prueba', email: 'user@example.test' };
  const create = (init) => {
    let value;
    value = init((patch) => { value = { ...value, ...patch }; }, () => value);
    return { getState: () => value };
  };
  const loader = createLoader({
    'zustand': { create },
    'src/api/auth.api.ts': { authApi: { me: async () => { if (state.me) return state.me(); if (state.meError) throw state.meError; return user; } } },
    'src/utils/onboardingStorage.ts': { onboardingStorage: { getCompleted: async () => true } },
    'src/utils/tokenStorage.ts': { tokenStorage: { getItem: async () => state.token, deleteItem: async () => { state.deleted++; state.token = null; } } },
    'src/services/mobileInstallation.service.ts': { mobileInstallationService: { unregisterNotifications: async () => {} } }
  });
  return { state, user, store: loader.load('src/store/auth.store.ts').useAuthStore };
}

for (const error of [new Error('Network Error'), { response: { status: 503 } }]) {
  test(`bootstrap conserva el token ante ${error.message || '503'} y permite reconectar`, async () => {
    const f = fixture(); f.state.meError = error;
    await f.store.getState().bootstrap();
    assert.equal(f.state.deleted, 0); assert.equal(f.store.getState().accessToken, 'saved-token');
    assert.equal(f.store.getState().user, null); assert.equal(f.store.getState().sessionUnavailable, true);
    assert.equal(f.store.getState().isBootstrapping, false);
    f.state.meError = null;
    await f.store.getState().refreshMe();
    assert.equal(f.store.getState().user.id, f.user.id); assert.equal(f.store.getState().sessionUnavailable, false);
  });
}

test('un fallo transitorio no retira al usuario ya validado', async () => {
  const f = fixture(); await f.store.getState().bootstrap();
  f.state.meError = new Error('offline'); await f.store.getState().refreshMe();
  assert.equal(f.store.getState().user.id, f.user.id); assert.equal(f.state.deleted, 0);
});

test('un 401 real elimina la sesión y permite volver al acceso', async () => {
  const f = fixture(); f.state.meError = { response: { status: 401 } };
  await f.store.getState().bootstrap();
  assert.equal(f.state.deleted, 1); assert.equal(f.store.getState().accessToken, null);
  assert.equal(f.store.getState().sessionUnavailable, false);
});

test('una validación que termina después de logout no restaura la cuenta anterior', async () => {
  const f = fixture(); let resolve;
  f.state.me = () => new Promise((done) => { resolve = done; });
  const pending = f.store.getState().bootstrap();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await f.store.getState().logout(); resolve(f.user); await pending;
  assert.equal(f.store.getState().user, null); assert.equal(f.store.getState().accessToken, null);
});

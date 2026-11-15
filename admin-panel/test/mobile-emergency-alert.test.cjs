/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));

// Exercise the component's lifecycle and event handlers without speakers, sockets or a DOM server.
function mount({ status = 200, sessionStatus = 'active', storageFails = false, notificationBatches = [[]] } = {}) {
  const slots = [], pending = [], requests = [], listeners = new Map(), timers = new Map();
  let cursor = 0, timerId = 0;
  const alarms = [], channels = [], handlers = {};
  const stateSlot = initial => {
    const index = cursor++;
    if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
    return slots[index];
  };
  const react = {
    useRef(initial) { const slot = stateSlot(() => ({ current: initial })); return slot.value; },
    useState(initial) { const slot = stateSlot(initial); return [slot.value, value => { slot.value = value; }]; },
    useEffect(effect, deps) {
      const slot = stateSlot(() => ({}));
      if (!slot.value.deps || deps.some((value, i) => value !== slot.value.deps[i])) {
        pending.push(() => { slot.value.cleanup?.(); slot.value.cleanup = effect(); slot.value.deps = deps; });
      }
    },
  };
  class Alarm {
    constructor() { this.starts = 0; this.stops = 0; this.retries = 0; alarms.push(this); }
    start() { this.starts++; }
    stop() { this.stops++; }
    retry() { this.retries++; }
  }
  class Channel {
    constructor() { this.messages = []; channels.push(this); }
    postMessage(message) { this.messages.push(message); }
    close() { this.closed = true; }
  }
  const socket = { on(name, callback) { handlers[name] = callback; }, disconnect() {} };
  const storage = new Map([['auth_token', 'unit-test-token']]);
  const source = fs.readFileSync(path.join(__dirname, '../components/MobileEmergencyAlert.tsx'), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, AbortController, process: { env: { NEXT_PUBLIC_BACKEND_URL: 'http://backend.test' } },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'socket.io-client') return { io: () => socket };
      if (name === 'lucide-react') return {};
      if (name.endsWith('session-presentation')) {
        const helper = {};
        vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/session-presentation.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: helper });
        return helper;
      }
      if (name.endsWith('emergency-alarm')) return { EmergencyAlarm: Alarm };
      if (name.endsWith('emergency-alert-events')) return { SESSION_ENDED_EVENT: 'kids4safe:admin-session-ended' };
      throw Error('Unexpected module: ' + name);
    },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem(key, value) { if (storageFails) throw Error('unavailable'); storage.set(key, value); } },
    BroadcastChannel: Channel,
    window: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) },
    setInterval(callback) { timers.set(++timerId, callback); return timerId; }, clearInterval(id) { timers.delete(id); },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.includes('/notifications/admin?')) {
        const batch = notificationBatches.length > 1 ? notificationBatches.shift() : notificationBatches[0];
        if (batch instanceof Error) throw batch;
        return { ok: true, json: async () => ({ notifications: batch }) };
      }
      return { status, ok: status < 400, json: async () => ({ status: sessionStatus }) };
    },
  });
  const render = () => { cursor = 0; const tree = exports.MobileEmergencyAlert(); while (pending.length) pending.shift()(); return tree; };
  const buttons = tree => {
    if (!tree || typeof tree !== 'object') return [];
    const children = tree.props?.children;
    return [...(tree.type === 'button' ? [tree] : []), ...(Array.isArray(children) ? children : [children]).flatMap(buttons)];
  };
  const clickSilence = tree => buttons(tree).find(button => JSON.stringify(button.props.children).includes('Silenciar alarma')).props.onClick();
  render();
  return { render, clickSilence, notify: payload => handlers['admin-notification'](payload), alarms, channels, listeners, requests, timers,
    reconnect: () => handlers.connect(),
    unmount() { for (const slot of slots) slot.value?.cleanup?.(); } };
}
const notification = { id: 'test-alert', type: 'mobile_emergency_started', sessionId: 'test-session', message: 'Test alert' };

test('explicit silence works with blocked storage and the same alert cannot restart', async () => {
  const h = mount({ storageFails: true });
  h.notify(notification); const tree = h.render();
  h.clickSilence(tree); h.notify(notification);
  assert.equal(h.render(), null);
  h.listeners.get('pointerdown')();
  assert.equal(h.alarms[0].retries, 0);
  assert.equal(h.alarms[0].starts, 1);
  assert.ok(h.alarms[0].stops > 0);
  await tick(); h.unmount();
});

test('an unread alert for an already completed session is acknowledged and silenced', async () => {
  const h = mount({ sessionStatus: 'completed' });
  h.notify(notification); h.render(); await tick();
  assert.equal(h.render(), null);
  assert.ok(h.requests.some(r => r.options.method === 'PATCH'));
  assert.equal(h.timers.size, 1); // Pending-alert polling remains active until unmount.
  h.unmount();
});

test('a deleted session stops its stale alarm, but a network authorization failure does not hide it', async () => {
  const deleted = mount({ status: 404 });
  deleted.notify(notification); deleted.render(); await tick();
  assert.equal(deleted.render(), null);
  deleted.unmount();
  const forbidden = mount({ status: 403 });
  forbidden.notify(notification); forbidden.render(); await tick();
  assert.notEqual(forbidden.render(), null);
  forbidden.unmount();
});

test('acknowledging in another tab stops this tab without a broadcast feedback loop', () => {
  const h = mount(); h.notify(notification); h.render();
  h.channels[0].onmessage({ data: { id: notification.id, sessionId: notification.sessionId } });
  assert.equal(h.render(), null);
  assert.equal(h.channels[0].messages.length, 0);
  h.unmount();
});

test('successful session deletion clears the matching alarm and leaves other sessions alone', () => {
  const h = mount(); h.notify(notification); h.render();
  h.listeners.get('kids4safe:admin-session-ended')({ detail: { sessionId: 'other-session' } });
  assert.notEqual(h.render(), null);
  h.listeners.get('kids4safe:admin-session-ended')({ detail: { sessionId: notification.sessionId } });
  assert.equal(h.render(), null);
  h.unmount();
});

test('a delayed unread-notification response cannot restart audio after unmount', async () => {
  const h = mount(); h.unmount(); await tick();
  assert.equal(h.alarms[0].starts, 0);
  assert.equal(h.channels[0].closed, true);
});

test('reconnection retrieves an emergency missed while the socket was offline', async () => {
  const h = mount({ notificationBatches: [[], [notification]] });
  await tick();
  assert.equal(h.render(), null);
  await h.reconnect();
  assert.notEqual(h.render(), null);
  assert.equal(h.alarms[0].starts, 1);
  await h.reconnect();
  assert.equal(h.alarms[0].starts, 1);
  h.unmount();
  assert.equal(h.timers.size, 0);
});

test('polling recovers after a failed initial request without a socket event', async () => {
  const h = mount({ notificationBatches: [new Error('offline'), [notification]] });
  await tick();
  assert.equal(h.render(), null);
  for (const poll of [...h.timers.values()]) poll();
  await tick();
  const tree = h.render();
  assert.notEqual(tree, null);
  h.clickSilence(tree);
  await h.reconnect();
  assert.equal(h.render(), null);
  assert.equal(h.alarms[0].starts, 1);
  h.unmount();
  assert.equal(h.timers.size, 0);
});

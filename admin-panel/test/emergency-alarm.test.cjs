/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness({ play = () => Promise.resolve(), resume = () => Promise.resolve(), suspended = false } = {}) {
  const audios = [], contexts = [], timers = new Map(), blocked = [];
  let timerId = 0;
  class Audio {
    constructor() { this.pauses = 0; this.currentTime = 0; audios.push(this); }
    play() { return play(); }
    pause() { this.pauses++; }
  }
  class Context {
    constructor() { this.state = suspended ? 'suspended' : 'running'; this.currentTime = 0; this.nodes = []; contexts.push(this); }
    async resume() { await resume(); this.state = 'running'; }
    async close() { this.closed = true; this.state = 'closed'; }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime() {} }, starts: 0, stops: 0, disconnects: 0,
        connect() {}, start() { this.starts++; }, stop() { this.stops++; }, disconnect() { this.disconnects++; } };
      this.nodes.push(oscillator); return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  const loaded = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../lib/emergency-alarm.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports: loaded.exports, Audio, window: { AudioContext: Context },
    setInterval(fn) { timers.set(++timerId, fn); return timerId; }, clearInterval(id) { timers.delete(id); } });
  const alarm = new loaded.exports.EmergencyAlarm(value => blocked.push(value));
  return { alarm, audios, contexts, timers, blocked };
}

test('dismissal pauses and rewinds a looping alarm; later gestures cannot restart it', async () => {
  const h = harness();
  h.alarm.start(); await tick();
  assert.equal(h.audios[0].loop, true);
  h.audios[0].currentTime = 10;
  h.alarm.stop(); h.alarm.retry(); await tick();
  assert.equal(h.audios[0].currentTime, 0);
  assert.ok(h.audios[0].pauses > 0);
  assert.equal(h.audios.length, 1);
  assert.equal(h.timers.size, 0);
});

test('an MP3 play request resolving after dismissal is stopped again', async () => {
  const pending = deferred(); const h = harness({ play: () => pending.promise });
  h.alarm.start(); h.alarm.stop(); pending.resolve(); await tick();
  assert.equal(h.audios[0].pauses, 2);
  assert.deepEqual(h.blocked, []);
  assert.equal(h.timers.size, 0);
});

test('an MP3 failure after dismissal cannot start the fallback alarm', async () => {
  const pending = deferred(); const h = harness({ play: () => pending.promise });
  h.alarm.start(); h.alarm.stop(); pending.reject(Error('unavailable')); await tick();
  assert.equal(h.contexts.length, 0);
  assert.equal(h.timers.size, 0);
});

test('fallback oscillators, audio context and repeat timer all stop immediately', async () => {
  const h = harness({ play: () => Promise.reject(Error('missing MP3')) });
  h.alarm.start(); await tick();
  assert.equal(h.contexts[0].nodes.length, 3);
  assert.equal(h.timers.size, 1);
  h.alarm.stop();
  assert.equal(h.timers.size, 0);
  assert.equal(h.contexts[0].closed, true);
  for (const oscillator of h.contexts[0].nodes) {
    assert.equal(oscillator.stops, 2);
    assert.ok(oscillator.disconnects > 0);
  }
});

test('resuming a suspended context after dismissal cannot schedule new tones', async () => {
  const pending = deferred();
  const h = harness({ play: () => Promise.reject(Error('blocked')), suspended: true, resume: () => pending.promise });
  h.alarm.start(); await tick(); h.alarm.stop(); pending.resolve(); await tick();
  assert.equal(h.contexts[0].nodes.length, 0);
  assert.equal(h.timers.size, 0);
});

test('a stale play request cannot stop a newer emergency alarm', async () => {
  const first = deferred(); let plays = 0;
  const h = harness({ play: () => ++plays === 1 ? first.promise : Promise.resolve() });
  h.alarm.start(); h.alarm.start(); await tick(); first.resolve(); await tick();
  assert.ok(h.audios[0].pauses >= 2);
  assert.equal(h.audios[1].pauses, 0);
  h.alarm.stop();
});

test('a pending browser resume reports blocked sound and allows a gesture retry', async () => {
  const pending = deferred();
  let plays = 0;
  const h = harness({
    play: () => ++plays === 1 ? Promise.reject(Error('autoplay blocked')) : Promise.resolve(),
    suspended: true,
    resume: () => pending.promise,
  });
  h.alarm.start(); await tick();
  assert.equal(h.blocked.at(-1), true);
  h.alarm.retry(); await tick();
  assert.equal(plays, 2);
  assert.equal(h.blocked.at(-1), false);
  pending.resolve(); await tick();
  assert.equal(h.contexts[0].nodes.length, 0);
  h.alarm.stop();
});

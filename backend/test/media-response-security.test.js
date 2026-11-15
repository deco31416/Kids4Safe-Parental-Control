const assert = require('node:assert/strict');
const test = require('node:test');
const { ScreenMediaController } = require('../dist/storage/screen-media.controller');

test('signed screen media permits cross-origin embedding by the admin panel', async () => {
  const headers = {};
  const recorder = { read: async () => Buffer.from('jpeg') };
  const urls = { verify: () => 'session/camera.jpg' };
  const response = {
    setHeader: (name, value) => { headers[name] = value; },
    send: () => undefined,
  };
  const controller = new ScreenMediaController(recorder, urls);

  await controller.get('token', 'signature', response);

  assert.equal(headers['Cross-Origin-Resource-Policy'], 'cross-origin');
  assert.equal(headers['Content-Type'], 'image/jpeg');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

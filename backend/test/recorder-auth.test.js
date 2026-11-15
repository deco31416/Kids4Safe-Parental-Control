const assert = require('node:assert/strict');
const test = require('node:test');
const { validateRecorderServiceToken } = require('../dist/realtime/recorder-auth');

test('recorder service token requires an exact non-empty match', () => {
  assert.equal(validateRecorderServiceToken(undefined, 'expected'), false);
  assert.equal(validateRecorderServiceToken('expected', undefined), false);
  assert.equal(validateRecorderServiceToken('wrong', 'expected'), false);
  assert.equal(validateRecorderServiceToken('expected', 'expected'), true);
});

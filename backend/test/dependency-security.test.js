const assert = require('node:assert/strict');
const test = require('node:test');
const { FileTypeValidator } = require('@nestjs/common');
const Joi = require('joi');
const mongoose = require('mongoose');
const qs = require('qs');
const { v4: uuidv4 } = require('uuid');

test('qs safely serializes null comma-array entries', () => {
  assert.doesNotThrow(() =>
    qs.stringify(
      { value: [null] },
      { arrayFormat: 'comma', encodeValuesOnly: true },
    ),
  );
});

test('Mongoose update casting does not pollute Object prototype', () => {
  const modelName = 'DependencySecuritySmoke';
  const model =
    mongoose.models[modelName] ||
    mongoose.model(modelName, new mongoose.Schema({ safe: String }));
  const update = {
    [`${String.fromCharCode(36)}set`]: { '__proto__.polluted': 'yes' },
  };

  try {
    model.updateOne({}, update).cast(model);
  } catch {}

  assert.equal({}.polluted, undefined);
});

test('UUID and Joi retain the application APIs', () => {
  assert.match(uuidv4(), /^[0-9a-f-]{36}$/);
  assert.equal(Joi.object({ port: Joi.number() }).validate({ port: 3000 }).error, undefined);
});

test('Nest FileTypeValidator detects a complete PNG buffer', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const validator = new FileTypeValidator({ fileType: 'image/png' });
  const valid = await validator.isValid({
    buffer: png,
    mimetype: 'image/png',
    originalname: 'smoke.png',
    size: png.length,
  });

  assert.equal(valid, true);
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { assertLocalMutation } = require('../dist/scripts/script-safety');

function typescriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? typescriptFiles(target) : [target];
  }).filter((file) => file.endsWith('.ts'));
}

test('source never contains the retired shared passwords', () => {
  const forbidden = ['SuperAdmin123!@#', 'Admin123!@#', 'Viewer123!@#'];
  const source = typescriptFiles(path.join(__dirname, '..', 'src'))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  for (const password of forbidden) {
    assert.equal(source.includes(password), false);
  }
});

test('user mutation scripts are blocked in production', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousFlag = process.env.ALLOW_USER_RESET;
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_USER_RESET = 'true';

  try {
    assert.throws(
      () => assertLocalMutation('ALLOW_USER_RESET', 'test mutation'),
      /bloqueado en NODE_ENV=production/,
    );
  } finally {
    process.env.NODE_ENV = previousEnvironment;
    process.env.ALLOW_USER_RESET = previousFlag;
  }
});

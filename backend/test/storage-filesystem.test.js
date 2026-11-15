const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { FileStorageService } = require('../dist/storage/file-storage.service');
const { MediaStorageService } = require('../dist/storage/media-storage.service');
const { StoragePathService } = require('../dist/storage/storage-path.service');
const { StorageUrlService } = require('../dist/storage/storage-url.service');

function config(values) {
  return { get: (key) => values[key] };
}

test('filesystem guarda, firma, lee y elimina sin salir de la raíz', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-storage-'));
  const values = {
    BACKEND_PUBLIC_URL: 'http://localhost:7000',
    JWT_SECRET: 'storage-test-secret-at-least-32-characters',
    MEDIA_STORAGE_ROOT: root,
    NODE_ENV: 'test',
  };
  const paths = new StoragePathService(config(values));
  const files = new FileStorageService(paths, config(values));
  const urls = new StorageUrlService(config(values));
  const media = new MediaStorageService(files, urls);
  try {
    await files.onModuleInit();
    const stored = await media.uploadAudio(
      `data:audio/webm;base64,${Buffer.from('safe-audio').toString('base64')}`,
      'sessions/test/audio',
    );
    assert.equal(fs.existsSync(paths.resolve(stored.key)), true);
    const parsed = new URL(stored.url);
    const token = parsed.pathname.split('/').pop();
    assert.equal(urls.verify(token, parsed.searchParams.get('signature'), parsed.searchParams.get('expires')), stored.key);
    assert.throws(() => paths.resolve('../escape'));
    await media.deleteFile(stored.key);
    assert.equal(fs.existsSync(paths.resolve(stored.key)), false);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('producción sin Railway Volume queda no disponible', async () => {
  const paths = new StoragePathService(config({ NODE_ENV: 'production' }));
  const files = new FileStorageService(paths, config({}));
  assert.equal((await files.health()).available, false);
});

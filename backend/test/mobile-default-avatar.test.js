require('ts-node/register/transpile-only');
require('reflect-metadata');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const mongoose = require('mongoose');
const { MobileProfileSchema } = require('../src/mobile-profile/mobile-profile.schema');
const { MobileProfileService } = require('../src/mobile-profile/mobile-profile.service');
const { StoragePathService } = require('../src/storage/storage-path.service');
const { FileStorageService } = require('../src/storage/file-storage.service');
const { MediaStorageService } = require('../src/storage/media-storage.service');
const { StorageUrlService } = require('../src/storage/storage-url.service');

const Profile = mongoose.model('DefaultAvatarTestProfile', MobileProfileSchema);
const query = (value) => ({ lean: () => ({ exec: async () => value }) });

test('cada perfil nuevo recibe una de las dos ilustraciones y conserva la elección guardada', (t) => {
  const random = t.mock.method(crypto, 'randomInt', (max) => { assert.equal(max, 2); return 0; });
  const first = new Profile({ mobileUnitId: 'unit-1', securityId: 'test-1' });
  assert.equal(first.defaultAvatar, 'perfil01');

  random.mock.mockImplementation(() => 1);
  const second = new Profile({ mobileUnitId: 'unit-2', securityId: 'test-2' });
  assert.equal(second.defaultAvatar, 'perfil02');
  const saved = second.toObject();

  random.mock.mockImplementation(() => 0);
  assert.equal(new Profile(saved).defaultAvatar, 'perfil02');
  assert.ok(new Profile({ mobileUnitId: 'unit-3', securityId: 'test-3', defaultAvatar: 'invalid' }).validateSync());
});

test('consultar un perfil existente conserva su avatar y no genera ni sube otra foto', async (t) => {
  t.mock.method(crypto, 'randomInt', () => { throw new Error('No debe volver a sortear'); });
  const existing = {
    _id: 'profile-1', mobileUserId: 'user-1', mobileUnitId: 'unit-1',
    fullName: 'Persona de prueba', phone: '123', defaultAvatar: 'perfil02',
    avatarPublicId: 'profiles/mobile/unit-1/photo.png', avatarUri: 'old-signed-url',
  };
  const model = {
    findOne: () => query(existing),
    create: () => { throw new Error('No debe crear otro perfil'); },
  };
  const user = { findById: () => query({ fullName: existing.fullName, phone: existing.phone }) };
  const storage = {
    getSignedUrl: (key) => `https://backend.test/media/${key}`,
    uploadMobileAvatar: () => { throw new Error('No debe sobrescribir la foto'); },
  };
  const service = new MobileProfileService(model, {}, user, {}, storage);
  const result = await service.getOrCreateForUser('user-1');
  assert.equal(result.defaultAvatar, 'perfil02');
  assert.equal(result.avatarUri, 'https://backend.test/media/profiles/mobile/unit-1/photo.png');
  assert.equal(result.avatarPublicId, undefined);
  assert.equal(existing.avatarUri, 'old-signed-url');
});

test('los dispositivos vinculados reciben la misma ilustración de la cuenta', async () => {
  const writes = [];
  const model = {
    findOneAndUpdate: (filter, update) => ({ exec: async () => writes.push({ filter, update }) }),
  };
  const user = {
    findById: () => query({ primaryMobileUnitId: 'unit-1', linkedMobileUnitIds: ['unit-1', 'unit-2'] }),
  };
  const service = new MobileProfileService(model, {}, user, {}, {});
  await service.mirrorProfileToUserUnits('user-1', { defaultAvatar: 'perfil02', avatarUri: 'personal-photo' });
  assert.equal(writes.length, 2);
  for (const { update } of writes) {
    assert.equal(update.$set.defaultAvatar, 'perfil02');
    assert.equal(update.$set.avatarUri, 'personal-photo');
  }
});

test('un perfil antiguo sin ilustración conserva un respaldo estable al sincronizar', async () => {
  let update;
  const model = { findOneAndUpdate: (_filter, value) => ({ exec: async () => { update = value; } }) };
  const user = { findById: () => query({ primaryMobileUnitId: 'unit-1' }) };
  const service = new MobileProfileService(model, {}, user, {}, {});
  await service.mirrorProfileToUserUnits('user-1', { avatarUri: 'existing-photo' });
  assert.equal(update.$set.defaultAvatar, 'perfil01');
  assert.equal(update.$set.avatarUri, 'existing-photo');
});

test('las fotos subidas se guardan en el volumen Railway y sobreviven a recrear el servicio', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kids4safe-avatar-'));
  const config = { get: (key) => ({
    RAILWAY_VOLUME_MOUNT_PATH: root,
    MEDIA_STORAGE_ROOT: path.join(root, 'unused-fallback'),
    NODE_ENV: 'production', BACKEND_PUBLIC_URL: 'https://backend.test',
    MEDIA_SIGNING_SECRET: 'avatar-test-signing-secret-at-least-32-characters',
  })[key] };
  const paths = new StoragePathService(config);
  const files = new FileStorageService(paths, config);
  const urls = new StorageUrlService(config);
  const storage = new MediaStorageService(files, urls);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
  try {
    await files.onModuleInit();
    const uploaded = await storage.uploadMobileAvatar('unit-1', `data:image/png;base64,${png.toString('base64')}`);
    assert.equal(paths.root, path.join(root, 'backend'));
    assert.match(uploaded.publicId, /^profiles\/mobile\/unit-1\/avatar_.*\.png$/);
    assert.deepEqual(await fs.readFile(paths.resolve(uploaded.publicId)), png);
    assert.equal((await files.health()).provider, 'filesystem');

    const recreatedFiles = new FileStorageService(new StoragePathService(config), config);
    const reopened = await recreatedFiles.open(uploaded.publicId);
    assert.deepEqual(await fs.readFile(reopened.absolutePath), png);
    const link = new URL(new MediaStorageService(recreatedFiles, urls).getSignedUrl(uploaded.publicId));
    assert.equal(urls.verify(link.pathname.split('/').pop(), link.searchParams.get('signature'), link.searchParams.get('expires')), uploaded.publicId);
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('kids4safe-avatar-'));
    await fs.rm(root, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const test = require('node:test');
const { RecordingsService } = require('../dist/recordings/recordings.service');

function fixture() {
  const saved = [];
  const deletedFiles = [];
  const items = new Map([
    ['a', { _id: 'a', sessionId: 'session-1', status: 'active', storageProvider: 'filesystem', storageKey: 'video/a.webm' }],
    ['b', { _id: 'b', sessionId: 'session-1', status: 'active', storageProvider: 'filesystem', storageKey: 'video/b.webm' }],
    ['c', { _id: 'c', sessionId: 'session-2', status: 'active', storageProvider: 'filesystem', storageKey: 'video/c.webm' }],
  ]);
  for (const item of items.values()) item.save = async () => saved.push(item._id);
  const model = {
    findById: async (id) => items.get(id) || null,
    find: (query) => ({
      select: () => ({
        lean: () => ({
          exec: async () => Array.from(items.values())
            .filter((item) => item.sessionId === query.sessionId && item.status === query.status)
            .map(({ _id }) => ({ _id })),
        }),
      }),
    }),
  };
  const files = { delete: async (key) => deletedFiles.push(key) };
  return { deletedFiles, saved, service: new RecordingsService(model, files, {}) };
}

test('batch deletion deduplicates ids and removes files before metadata', async () => {
  const { deletedFiles, saved, service } = fixture();
  const result = await service.deleteMany(['a', 'a', 'b']);
  assert.deepEqual(result, { deletedCount: 2, requestedCount: 2 });
  assert.deepEqual(deletedFiles, ['video/a.webm', 'video/b.webm']);
  assert.deepEqual(saved, ['a', 'b']);
});

test('session deletion only removes active recordings from that session', async () => {
  const { deletedFiles, service } = fixture();
  const result = await service.deleteSession('session-1');
  assert.equal(result.deletedCount, 2);
  assert.deepEqual(deletedFiles, ['video/a.webm', 'video/b.webm']);
});

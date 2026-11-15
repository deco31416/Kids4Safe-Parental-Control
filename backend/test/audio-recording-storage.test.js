const assert = require('node:assert/strict');
const test = require('node:test');
const { AudioRecordingService } = require('../dist/recordings/audio-recording.service');

test('continuous audio is registered with its session and QR identity', async () => {
  const uploads = [];
  const registrations = [];
  const storage = {
    uploadAudio: async (dataUrl, folder) => {
      uploads.push({ dataUrl, folder });
      return {
        bytes: 10,
        contentType: 'audio/webm',
        publicId: 'sessions/session-1/recordings/audio/audio.webm',
        sha256: 'hash',
        url: 'http://localhost:7000/media/audio',
      };
    },
  };
  const recordings = {
    registerAudio: async (input) => registrations.push(input),
  };
  const service = new AudioRecordingService(storage, recordings);

  for (let chunkIndex = 0; chunkIndex < 10; chunkIndex += 1) {
    await service.processAudioChunk({
      sessionId: 'session-1', qrId: 'qr-1',
      audioData: Buffer.from('a').toString('base64'), timestamp: Date.now(),
      chunkIndex, format: 'webm',
    });
  }

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].folder, 'sessions/session-1/recordings/audio');
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].sessionId, 'session-1');
  assert.equal(registrations[0].qrId, 'qr-1');
  assert.equal(registrations[0].stored.publicId, 'sessions/session-1/recordings/audio/audio.webm');
  assert.deepEqual(service.getBufferStats(), { sessions: 0, totalChunks: 0 });
});

test('failed metadata registration rolls back the stored file and keeps chunks for retry', async () => {
  const deleted = [];
  const storage = {
    uploadAudio: async () => ({
      bytes: 10, contentType: 'audio/webm', publicId: 'sessions/session-1/audio.webm',
      sha256: 'hash', url: 'http://localhost:7000/media/audio',
    }),
    deleteFile: async (key) => deleted.push(key),
  };
  const recordings = { registerAudio: async () => { throw new Error('mongo unavailable'); } };
  const service = new AudioRecordingService(storage, recordings);
  const chunk = {
    sessionId: 'session-1', qrId: 'qr-1',
    audioData: Buffer.from('a').toString('base64'), timestamp: Date.now(), format: 'webm',
  };

  for (let chunkIndex = 0; chunkIndex < 9; chunkIndex += 1) {
    await service.processAudioChunk({ ...chunk, chunkIndex });
  }
  await assert.rejects(
    service.processAudioChunk({ ...chunk, chunkIndex: 9 }),
    /mongo unavailable/,
  );

  assert.deepEqual(deleted, ['sessions/session-1/audio.webm']);
  assert.deepEqual(service.getBufferStats(), { sessions: 1, totalChunks: 10 });
});

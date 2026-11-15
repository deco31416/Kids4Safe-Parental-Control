const assert = require('node:assert/strict');
const test = require('node:test');
const { MobileAvatarRemovalService } = require('../dist/mobile-profile/mobile-avatar-removal.service');
const { SubjectPhotoRemovalService } = require('../dist/subjects/subject-photo-removal.service');

test('mobile avatar removal clears every shared reference before deleting local media', async () => {
  const operations = [];
  const profile = {
    avatarPublicId: 'profiles/mobile/unit-1/avatar.webp',
    avatarUri: 'https://local/media/avatar',
    avatarThumbnailUrl: 'https://local/media/avatar',
    mobileUnitId: 'unit-1',
  };
  const profiles = {
    findOne: () => ({ lean: () => ({ exec: async () => profile }) }),
    updateMany: (query, update) => ({ exec: async () => operations.push({ query, update }) }),
  };
  const storage = { deleteFile: async (key) => operations.push({ deleteFile: key }) };
  const audit = { log: async (entry) => operations.push({ audit: entry }) };
  const profileService = { getForAdmin: async () => ({ mobileUnitId: 'unit-1', avatarUri: '' }) };

  const service = new MobileAvatarRemovalService(profiles, storage, audit, profileService);
  const result = await service.removeByAdmin('unit-1', { userId: 'admin-1' });

  assert.equal(result.avatarUri, '');
  assert.deepEqual(operations[0].update.$unset, {
    avatarPublicId: 1, avatarThumbnailUrl: 1, avatarUri: 1,
  });
  assert.equal(operations[1].deleteFile, profile.avatarPublicId);
  assert.equal(operations[2].audit.eventType, 'MOBILE_PROFILE_AVATAR_REMOVED_BY_ADMIN');
});

test('subject photo removal clears session snapshots and hides internal keys', async () => {
  const subjectId = '507f1f77bcf86cd799439011';
  const operations = [];
  const subject = { _id: subjectId, displayName: 'Persona', photoPublicId: 'profiles/subjects/a/photo.webp' };
  const updated = { _id: subjectId, displayName: 'Persona', updatedBy: { adminId: 'admin-1' } };
  const subjects = {
    findById: () => ({ lean: () => ({ exec: async () => subject }) }),
    findByIdAndUpdate: (_id, update) => ({
      lean: () => ({ exec: async () => { operations.push({ subjectUpdate: update }); return updated; } }),
    }),
  };
  const sessions = {
    updateMany: (query, update) => ({ exec: async () => operations.push({ query, sessionUpdate: update }) }),
  };
  const storage = { deleteFile: async (key) => operations.push({ deleteFile: key }) };
  const audit = { log: async (entry) => operations.push({ audit: entry }) };

  const service = new SubjectPhotoRemovalService(subjects, sessions, storage, audit);
  const result = await service.remove(subjectId, { userId: 'admin-1' });

  assert.equal(result.updatedBy, undefined);
  assert.deepEqual(operations[1].sessionUpdate.$unset, {
    'subject.photoUrl': 1, 'subject.photoThumbnailUrl': 1,
  });
  assert.equal(operations[2].deleteFile, subject.photoPublicId);
  assert.equal(operations[3].audit.eventType, 'QR_LINK_SUBJECT_PHOTO_REMOVED_BY_ADMIN');
});

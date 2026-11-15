import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { FileStorageService } from '../storage/file-storage.service';
import { extensionFor } from '../storage/storage-mime';
import { StorageUrlService } from '../storage/storage-url.service';
import { dropLegacyTtlIndex } from '../storage/drop-legacy-ttl';
import { Recording, RecordingDocument } from './recording.schema';

export interface FinishRecordingDto {
  sessionId: string;
  qrId: string;
  qrName?: string;
  cloudinaryUrl?: string;
  publicId: string;
  secureUrl?: string;
  format?: string;
  duration?: number;
  sizeBytes?: number;
  mimeType?: string; sha256?: string;
  storageKey?: string; storageProvider?: 'filesystem' | 'cloudinary';
  metadata?: { tracks?: string[]; resolution?: string; codec?: string };
  uploadedBy?: string;
}

type UploadMetadata = {
  contentType: string;
  format: string;
  qrId: string;
  sessionId: string;
};

@Injectable()
export class RecordingsService {
  constructor(
    @InjectModel(Recording.name) private readonly model: Model<RecordingDocument>,
    private readonly files: FileStorageService,
    private readonly urls: StorageUrlService,
  ) {}

  init(sessionId: string) {
    this.segment(sessionId);
    return { method: 'POST', provider: 'filesystem', uploadUrl: '/recordings/upload' };
  }

  async upload(input: NodeJS.ReadableStream, metadata: UploadMetadata) {
    if (!['video/mp4', 'video/webm'].includes(metadata.contentType)) {
      throw new BadRequestException('Formato de video no permitido');
    }
    const extension = extensionFor(metadata.contentType);
    const sessionId = this.segment(metadata.sessionId);
    const key = `sessions/${sessionId}/recordings/video/recording_${Date.now()}_${randomUUID()}.${extension}`;
    const stored = await this.files.saveStream(key, input, metadata.contentType);
    const url = this.urls.create(key);
    return this.model.create({
      cloudinaryUrl: url,
      format: metadata.format,
      mimeType: metadata.contentType,
      publicId: key,
      qrId: metadata.qrId,
      secureUrl: url,
      sessionId: metadata.sessionId,
      sha256: stored.sha256,
      sizeBytes: stored.bytes,
      storageKey: key,
      storageProvider: 'filesystem',
    });
  }

  async finish(dto: FinishRecordingDto) { return this.model.create(dto); }
  async registerAudio(input: {
    sessionId: string; qrId: string; format: string;
    stored: { bytes: number; contentType: string; publicId: string; sha256: string; url: string };
  }) {
    return this.finish({
      sessionId: input.sessionId, qrId: input.qrId, format: input.format,
      cloudinaryUrl: input.stored.url, secureUrl: input.stored.url,
      publicId: input.stored.publicId, sizeBytes: input.stored.bytes,
      metadata: { tracks: ['audio'] },
      sha256: input.stored.sha256,
      storageKey: input.stored.publicId, storageProvider: 'filesystem',
      mimeType: input.stored.contentType,
    });
  }
  async getBySession(sessionId: string) {
    return this.model.find({ sessionId, status: 'active' }).sort({ uploadedAt: -1 }).lean().exec();
  }
  async getByQR(qrId: string, limit = 20) {
    return this.model.find({ qrId, status: 'active' }).sort({ uploadedAt: -1 }).limit(limit).lean().exec();
  }
  async getAll(limit = 50, skip = 0) {
    const query = { status: 'active' };
    const [recordings, total] = await Promise.all([
      this.model.find(query).sort({ uploadedAt: -1 }).limit(limit).skip(skip).lean().exec(),
      this.model.countDocuments(query),
    ]);
    return { recordings, total, limit, skip };
  }

  async removeLegacyTtlIndex() {
    await dropLegacyTtlIndex(this.model.collection, 'uploadedAt');
  }

  async delete(recordingId: string) {
    const recording = await this.model.findById(recordingId);
    if (!recording) return false;
    if (recording.storageProvider === 'filesystem' && recording.storageKey) {
      await this.files.delete(recording.storageKey);
    }
    recording.status = 'deleted';
    await recording.save();
    return true;
  }

  async deleteMany(recordingIds: string[]) {
    const ids = Array.from(new Set(recordingIds));
    let deletedCount = 0;
    for (const id of ids) {
      if (await this.delete(id)) deletedCount += 1;
    }
    return { deletedCount, requestedCount: ids.length };
  }

  async deleteSession(sessionId: string) {
    const recordings = await this.model
      .find({ sessionId, status: 'active' })
      .select('_id')
      .lean()
      .exec();
    return this.deleteMany(recordings.map((recording) => String(recording._id)));
  }

  async cleanupExpired(retentionDays: number) {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    const expired = await this.model.find({ status: 'active', uploadedAt: { $lt: cutoff } });
    let deleted = 0;
    for (const item of expired) {
      if (item.storageProvider === 'filesystem' && item.storageKey) await this.files.delete(item.storageKey);
      await item.deleteOne();
      deleted += 1;
    }
    return deleted;
  }

  private segment(value: string) {
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(value) || value.includes('..')) throw new Error('Identificador inválido');
    return value;
  }
}

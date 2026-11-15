import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileStorageService } from './file-storage.service';
import { decodeDataUrl, extensionFor } from './storage-mime';
import { StorageUrlService } from './storage-url.service';

@Injectable()
export class MediaStorageService {
  constructor(
    private readonly files: FileStorageService,
    private readonly urls: StorageUrlService,
  ) {}

  async uploadScreenshot(sessionId: string, dataUrl: string) {
    return this.storeDataUrl(dataUrl, `sessions/${this.segment(sessionId)}/screenshots`, 'screenshot', 'image/');
  }

  async uploadMobileAvatar(mobileUnitId: string, dataUrl: string) {
    return this.storeImage(dataUrl, `profiles/mobile/${this.segment(mobileUnitId)}`);
  }

  async uploadSubjectAvatar(subjectId: string, dataUrl: string) {
    return this.storeImage(dataUrl, `profiles/subjects/${this.segment(subjectId)}`);
  }

  async uploadAudio(dataUrl: string, folder = 'audio-clips') {
    const stored = await this.storeDataUrl(dataUrl, this.normalizeFolder(folder), 'audio', 'audio/');
    return { ...stored, duration: undefined };
  }

  async uploadPDF(buffer: Buffer, fileName: string, folder = 'reports') {
    const cleanName = this.segment(fileName.replace(/\.pdf$/i, ''));
    const key = `${this.normalizeFolder(folder)}/${cleanName}.pdf`;
    const stored = await this.files.save(key, buffer, 'application/pdf');
    const url = this.urls.create(key);
    return { url, publicId: key, secure_url: url, public_id: key, ...stored };
  }

  getSignedUrl(key: string, _expiresInSeconds?: number): string {
    return this.urls.create(key);
  }

  async deleteScreenshot(key: string) { await this.files.delete(key); }
  async deleteFile(key: string) { await this.files.delete(key); }
  async deleteSessionScreenshots(sessionId: string) {
    await this.files.deletePrefix(`sessions/${this.segment(sessionId)}/screenshots`);
  }

  private async storeImage(dataUrl: string, folder: string) {
    const stored = await this.storeDataUrl(dataUrl, folder, 'avatar', 'image/');
    return { ...stored, thumbnailUrl: stored.url };
  }

  private async storeDataUrl(dataUrl: string, folder: string, prefix: string, expectedPrefix: string) {
    const { buffer, contentType } = decodeDataUrl(dataUrl);
    if (!contentType.startsWith(expectedPrefix)) throw new BadRequestException('Tipo multimedia no permitido para esta operación');
    const extension = extensionFor(contentType);
    const key = `${folder}/${prefix}_${Date.now()}_${randomUUID()}.${extension}`;
    const stored = await this.files.save(key, buffer, contentType);
    const url = this.urls.create(key);
    return { ...stored, url, publicId: key, thumbnailUrl: url };
  }

  private normalizeFolder(folder: string) {
    return folder.split('/').filter(Boolean).map((part) => this.segment(part)).join('/');
  }

  private segment(value: string) {
    const clean = value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+$/, '_');
    if (!clean) throw new Error('Segmento de almacenamiento vacío');
    return clean;
  }
}

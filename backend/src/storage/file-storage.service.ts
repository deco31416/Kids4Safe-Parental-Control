import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { constants, createWriteStream } from 'fs';
import { access, mkdir, rename, rm, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { contentTypeFor } from './storage-mime';
import { StoragePathService } from './storage-path.service';
import { OpenedFile, StorageHealth, StoredFile } from './storage.types';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly maxBytes: number;

  constructor(
    private readonly paths: StoragePathService,
    config: ConfigService,
  ) {
    this.maxBytes = Number(config.get('MEDIA_MAX_FILE_BYTES') || 100 * 1024 * 1024);
  }

  async onModuleInit() {
    if (this.paths.root) await mkdir(this.paths.root, { recursive: true });
  }

  async save(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
    if (data.length > this.maxBytes) throw new ServiceUnavailableException('Archivo excede el límite configurado');
    const absolutePath = this.paths.resolve(key);
    const tempDirectory = this.paths.resolve('.tmp');
    const tempPath = path.join(tempDirectory, randomUUID());
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await mkdir(tempDirectory, { recursive: true });
    try {
      await writeFile(tempPath, data, { flag: 'wx' });
      await rename(tempPath, absolutePath);
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
    return {
      bytes: data.length,
      contentType,
      key,
      sha256: createHash('sha256').update(data).digest('hex'),
    };
  }

  async open(key: string): Promise<OpenedFile> {
    const absolutePath = this.paths.resolve(key);
    const details = await stat(absolutePath);
    if (!details.isFile()) throw new Error('El recurso no es un archivo');
    return {
      absolutePath,
      bytes: details.size,
      contentType: contentTypeFor(key),
      key,
      sha256: '',
    };
  }

  async saveStream(key: string, input: NodeJS.ReadableStream, contentType: string): Promise<StoredFile> {
    const absolutePath = this.paths.resolve(key);
    const tempDirectory = this.paths.resolve('.tmp');
    const tempPath = path.join(tempDirectory, randomUUID());
    const hash = createHash('sha256');
    let bytes = 0;
    const limiter = new Transform({
      transform: (chunk, _encoding, callback) => {
        bytes += chunk.length;
        if (bytes > this.maxBytes) return callback(new Error('Archivo excede el límite configurado'));
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await mkdir(tempDirectory, { recursive: true });
    try {
      await pipeline(input, limiter, createWriteStream(tempPath, { flags: 'wx' }));
      await rename(tempPath, absolutePath);
      return { bytes, contentType, key, sha256: hash.digest('hex') };
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.paths.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    await rm(this.paths.resolve(prefix), { force: true, recursive: true });
  }

  async health(): Promise<StorageHealth> {
    if (!this.paths.root) return { available: false, provider: 'filesystem', reason: this.paths.unavailableReason };
    try {
      await mkdir(this.paths.root, { recursive: true });
      await access(this.paths.root, constants.R_OK | constants.W_OK);
      return { available: true, provider: 'filesystem' };
    } catch {
      return { available: false, provider: 'filesystem', reason: 'Raíz sin permisos de lectura/escritura' };
    }
  }
}

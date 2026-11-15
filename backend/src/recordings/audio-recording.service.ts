import { Injectable, Logger } from '@nestjs/common';
import { MediaStorageService } from '../storage/media-storage.service';
import { RecordingsService } from './recordings.service';

export interface AudioChunk {
  sessionId: string;
  qrId: string;
  audioData: string;
  timestamp: number;
  chunkIndex: number;
  format?: string;
}

@Injectable()
export class AudioRecordingService {
  private readonly logger = new Logger(AudioRecordingService.name);
  private readonly audioBuffers = new Map<string, Buffer[]>();
  private readonly chunkCounts = new Map<string, number>();

  constructor(
    private readonly storage: MediaStorageService,
    private readonly recordings: RecordingsService,
  ) {}

  async processAudioChunk(chunk: AudioChunk): Promise<void> {
    try {
      const buffer = Buffer.from(chunk.audioData, 'base64');
      if (!buffer.length) throw new Error('Chunk de audio vacío');
      const buffers = this.audioBuffers.get(chunk.sessionId) || [];
      buffers.push(buffer);
      this.audioBuffers.set(chunk.sessionId, buffers);
      const count = (this.chunkCounts.get(chunk.sessionId) || 0) + 1;
      this.chunkCounts.set(chunk.sessionId, count);
      if (count >= 10) await this.upload(chunk.sessionId, chunk.qrId, chunk.format || 'webm');
    } catch (error) {
      this.logger.error(`Error procesando audio: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async finishRecording(sessionId: string, qrId: string): Promise<string | null> {
    if (!this.audioBuffers.get(sessionId)?.length) return null;
    try {
      return await this.upload(sessionId, qrId, 'webm');
    } catch (error) {
      this.logger.error(`Error finalizando audio: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  clearBuffers(sessionId: string): void {
    this.audioBuffers.delete(sessionId);
    this.chunkCounts.delete(sessionId);
  }

  getBufferStats(): { sessions: number; totalChunks: number } {
    let totalChunks = 0;
    this.audioBuffers.forEach((buffers) => { totalChunks += buffers.length; });
    return { sessions: this.audioBuffers.size, totalChunks };
  }

  private async upload(sessionId: string, qrId: string, format: string): Promise<string> {
    const buffers = this.audioBuffers.get(sessionId);
    if (!buffers?.length) throw new Error('No hay buffers para guardar');
    const data = Buffer.concat(buffers);
    const result = await this.storage.uploadAudio(
      `data:audio/${format};base64,${data.toString('base64')}`,
      `sessions/${sessionId}/recordings/audio`,
    );
    try {
      await this.recordings.registerAudio({ sessionId, qrId, format, stored: result });
    } catch (error) {
      await this.storage.deleteFile(result.publicId).catch(() => {});
      throw error;
    }
    this.clearBuffers(sessionId);
    this.logger.log(`Audio guardado en filesystem: ${sessionId} (${result.bytes} bytes)`);
    return result.url;
  }
}

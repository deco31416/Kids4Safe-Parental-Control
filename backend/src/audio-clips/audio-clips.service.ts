import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AudioClip } from './schemas/audio-clip.schema';
import { MediaStorageService } from '../storage/media-storage.service';
import { dropLegacyTtlIndex } from '../storage/drop-legacy-ttl';

@Injectable()
export class AudioClipsService {
  private readonly logger = new Logger(AudioClipsService.name);

  constructor(
    @InjectModel(AudioClip.name)
    private audioClipModel: Model<AudioClip>,
    private mediaStorage: MediaStorageService,
  ) {}

  /**
   * Guarda un clip de audio en filesystem y MongoDB.
   * 
   * @param sessionId - ID de la sesión
   * @param audioBase64 - Audio en formato base64 (data:audio/webm;base64,...)
   * @returns AudioClip guardado
   */
  async saveAudioClip(
    sessionId: string,
    audioBase64: string,
  ): Promise<AudioClip> {
    try {
      this.logger.log(`🎤 [AudioClip] Guardando clip para sesión ${sessionId}`);

      const stored = await this.mediaStorage.uploadAudio(
        audioBase64,
        `sessions/${sessionId}/audio`,
      );

      // Guardar en MongoDB
      const audioClip = new this.audioClipModel({
        sessionId,
        url: stored.url,
        publicId: stored.publicId,
        capturedAt: new Date(),
        duration: stored.duration,
        sizeBytes: stored.bytes,
        storageKey: stored.key,
        storageProvider: 'filesystem',
        mimeType: stored.contentType,
        sha256: stored.sha256,
      });

      await audioClip.save();

      this.logger.log(`✅ Audio clip guardado: ${audioClip._id}`);

      return audioClip;
    } catch (error) {
      this.logger.error(`❌ Error guardando audio clip: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene todos los audio clips de una sesión
   */
  async getSessionAudioClips(sessionId: string): Promise<AudioClip[]> {
    const clips = await this.audioClipModel
      .find({ sessionId, deleted: false })
      .sort({ capturedAt: -1 })
      .exec();

    this.logger.log(`✅ Encontrados ${clips.length} audio clips para sesión ${sessionId}`);

    return clips;
  }

  async removeLegacyTtlIndex() {
    await dropLegacyTtlIndex(this.audioClipModel.collection, 'capturedAt');
  }

  /**
   * Elimina un audio clip
   */
  async deleteAudioClip(id: string): Promise<boolean> {
    try {
      const clip = await this.audioClipModel.findById(id);
      if (!clip) return false;

      // Eliminar archivo físico antes de actualizar MongoDB.
      await this.mediaStorage.deleteFile(clip.storageKey || clip.publicId);

      // Marcar como eliminado en MongoDB (soft delete)
      clip.deleted = true;
      await clip.save();

      this.logger.log(`✅ Audio clip eliminado: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error eliminando audio clip: ${error.message}`);
      return false;
    }
  }

  /**
   * Elimina múltiples audio clips
   */
  async deleteMultipleAudioClips(ids: string[]): Promise<number> {
    let deletedCount = 0;

    for (const id of ids) {
      const deleted = await this.deleteAudioClip(id);
      if (deleted) deletedCount++;
    }

    this.logger.log(`✅ ${deletedCount} audio clips eliminados`);
    return deletedCount;
  }

  /**
   * Elimina todos los audio clips de una sesión
   */
  async deleteSessionAudioClips(sessionId: string): Promise<number> {
    const clips = await this.audioClipModel.find({ sessionId, deleted: false });

    let deletedCount = 0;
    for (const clip of clips) {
      try {
        await this.mediaStorage.deleteFile(clip.storageKey || clip.publicId);
        clip.deleted = true;
        await clip.save();
        deletedCount++;
      } catch (error) {
        this.logger.error(`❌ Error eliminando audio clip ${clip._id}: ${error.message}`);
      }
    }

    this.logger.log(`✅ ${deletedCount} audio clips eliminados de sesión ${sessionId}`);
    return deletedCount;
  }

  /**
   * Limpia audio clips antiguos (mayores a 24 horas)
   * TTL index lo hace automáticamente, pero esta función manual por si acaso
   */
  async cleanupOldAudioClips(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oldClips = await this.audioClipModel.find({
      capturedAt: { $lt: oneDayAgo },
      deleted: false,
    });

    let deletedCount = 0;
    for (const clip of oldClips) {
      try {
        await this.mediaStorage.deleteFile(clip.storageKey || clip.publicId);
        await clip.deleteOne();
        deletedCount++;
      } catch (error) {
        this.logger.error(`❌ Error limpiando audio clip viejo: ${error.message}`);
      }
    }

    this.logger.log(`🧹 Limpiados ${deletedCount} audio clips antiguos`);
    return deletedCount;
  }
}

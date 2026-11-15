import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Screenshot } from './schemas/screenshot.schema';
import { ScreenRecorderClient } from '../storage/screen-recorder.client';
import { dropLegacyTtlIndex } from '../storage/drop-legacy-ttl';

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(
    @InjectModel(Screenshot.name)
    private screenshotModel: Model<Screenshot>,
    private screenRecorder: ScreenRecorderClient,
  ) {}

  /**
   * Guarda una nueva captura de pantalla
   */
  async saveScreenshot(
    sessionId: string,
    imageBase64: string,
    type: 'screen' | 'camera' = 'screen',
  ): Promise<Screenshot> {
    try {
      const stored = await this.screenRecorder.save(sessionId, imageBase64, type);

      // Guardar en MongoDB
      const screenshot = await this.screenshotModel.create({
        sessionId,
        url: stored.url,
        thumbnailUrl: stored.url,
        publicId: stored.key,
        storageKey: stored.key,
        storageProvider: 'screen-recorder',
        mimeType: stored.contentType,
        sizeBytes: stored.bytes,
        sha256: stored.sha256,
        capturedAt: new Date(),
        type,
      });

      this.logger.log(`✅ Screenshot guardado (${type}): ${screenshot._id}`);
      return screenshot;
    } catch (error) {
      this.logger.error('❌ Error guardando screenshot:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las capturas de una sesión
   */
  async getSessionScreenshots(sessionId: string): Promise<Screenshot[]> {
    this.logger.log(`🔍 Buscando capturas para sesión: ${sessionId}`);
    
    const screenshots = await this.screenshotModel
      .find({ sessionId, deleted: false })
      .sort({ capturedAt: -1 })
      .exec();
    
    this.logger.log(`✅ Encontradas ${screenshots.length} capturas`);
    return screenshots;
  }

  /**
   * Obtiene la última captura de una sesión
   */
  async getLatestScreenshot(sessionId: string): Promise<Screenshot | null> {
    return this.screenshotModel
      .findOne({ sessionId, deleted: false })
      .sort({ capturedAt: -1 })
      .exec();
  }

  /**
   * Cuenta las capturas de una sesión
   */
  async countSessionScreenshots(sessionId: string): Promise<number> {
    return this.screenshotModel.countDocuments({ sessionId, deleted: false });
  }

  async removeLegacyTtlIndex() {
    await dropLegacyTtlIndex(this.screenshotModel.collection, 'capturedAt');
  }

  /**
   * Elimina capturas antiguas (cleanup manual si TTL falla)
   */
  async cleanupOldScreenshots(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h atrás

    const oldScreenshots = await this.screenshotModel
      .find({ capturedAt: { $lt: cutoffDate }, deleted: false })
      .exec();

    for (const screenshot of oldScreenshots) {
      try {
        await this.deleteStoredFrame(screenshot);
        await screenshot.deleteOne();
      } catch (error) {
        this.logger.error(
          `❌ Error eliminando screenshot ${screenshot._id}:`,
          error,
        );
      }
    }

    this.logger.log(`🗑️ ${oldScreenshots.length} screenshots antiguos limpiados`);
    return oldScreenshots.length;
  }

  /**
   * Elimina un screenshot por ID y su archivo físico.
   */
  async deleteScreenshot(screenshotId: string): Promise<boolean> {
    try {
      const screenshot = await this.screenshotModel.findById(screenshotId);
      
      if (!screenshot) {
        this.logger.warn(`Screenshot ${screenshotId} no encontrado`);
        return false;
      }

      await this.deleteStoredFrame(screenshot);
      
      // Eliminar de MongoDB
      await this.screenshotModel.findByIdAndDelete(screenshotId);
      
      this.logger.log(`🗑️ Screenshot eliminado: ${screenshotId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error eliminando screenshot ${screenshotId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina múltiples screenshots y sus archivos físicos.
   */
  async deleteMultipleScreenshots(screenshotIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const id of screenshotIds) {
      try {
        const deleted = await this.deleteScreenshot(id);
        if (deleted) deletedCount++;
      } catch (error) {
        this.logger.error(`❌ Error eliminando screenshot ${id}:`, error);
      }
    }

    this.logger.log(`🗑️ ${deletedCount}/${screenshotIds.length} screenshots eliminados`);
    return deletedCount;
  }

  /**
   * Elimina todas las capturas de una sesión
   */
  async deleteSessionScreenshots(sessionId: string): Promise<number> {
    try {
      const screenshots = await this.screenshotModel
        .find({ sessionId })
        .exec();

      if (screenshots.some((item) => item.storageProvider === 'screen-recorder')) {
        await this.screenRecorder.deleteSession(sessionId);
      }
      
      // Eliminar de MongoDB
      const result = await this.screenshotModel.deleteMany({ sessionId });
      
      this.logger.log(`🗑️ ${result.deletedCount} screenshots de sesión ${sessionId} eliminados`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`❌ Error eliminando screenshots de sesión ${sessionId}:`, error);
      throw error;
    }
  }

  private async deleteStoredFrame(screenshot: Screenshot) {
    if (screenshot.storageProvider !== 'screen-recorder') {
      this.logger.warn(`Evidencia legacy sin migrar: ${screenshot._id}`);
      return;
    }
    await this.screenRecorder.delete(screenshot.storageKey || screenshot.publicId);
  }
}

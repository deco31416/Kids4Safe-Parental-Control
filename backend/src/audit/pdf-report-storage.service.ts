import { Injectable } from '@nestjs/common';
import { MediaStorageService } from '../storage/media-storage.service';

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class PdfReportStorage {
  constructor(private readonly storage: MediaStorageService) {}

  async store(pdf: Buffer, sessionId: string): Promise<string> {
    const fileName = `session-report-${sessionId}-${Date.now()}.pdf`;
    const result = await this.storage.uploadPDF(pdf, fileName, 'reports');
    return this.storage.getSignedUrl(
      result.public_id,
      SIGNED_URL_TTL_SECONDS,
    );
  }
}

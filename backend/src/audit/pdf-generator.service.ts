import { Injectable, Logger } from '@nestjs/common';
import { PdfBrowserRenderer } from './pdf-browser-renderer.service';
import { PdfReportDataService } from './pdf-report-data.service';
import { PdfReportStorage } from './pdf-report-storage.service';
import { PdfTemplateRenderer } from './pdf-template-renderer.service';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    private readonly reportData: PdfReportDataService,
    private readonly templateRenderer: PdfTemplateRenderer,
    private readonly browserRenderer: PdfBrowserRenderer,
    private readonly reportStorage: PdfReportStorage,
  ) {}

  async generateSessionReport(sessionId: string): Promise<string> {
    this.logger.log(`Generating PDF report for session ${sessionId}`);

    try {
      const data = await this.reportData.build(sessionId);
      const html = await this.templateRenderer.render(data);
      const pdf = await this.browserRenderer.render(html);
      const pdfUrl = await this.reportStorage.store(pdf, sessionId);

      this.logger.log(`PDF report generated successfully: ${pdfUrl}`);
      return pdfUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate PDF report: ${message}`, stack);
      throw error;
    }
  }
}

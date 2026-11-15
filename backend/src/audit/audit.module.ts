import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { AuditLog, AuditLogSchema } from './audit.schema';
import { Session, SessionSchema } from '../session/session.schema';
import { Location, LocationSchema } from '../location/location.schema';
import { PdfBrowserRenderer } from './pdf-browser-renderer.service';
import { PdfReportDataService } from './pdf-report-data.service';
import { PdfReportStorage } from './pdf-report-storage.service';
import { PdfTemplateRenderer } from './pdf-template-renderer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Location.name, schema: LocationSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    PdfGeneratorService,
    PdfReportDataService,
    PdfTemplateRenderer,
    PdfBrowserRenderer,
    PdfReportStorage,
  ],
  exports: [AuditService], // Para usarlo en otros módulos
})
export class AuditModule {}

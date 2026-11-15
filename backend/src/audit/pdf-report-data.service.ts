import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { Location } from '../location/location.schema';
import { Session } from '../session/session.schema';
import { AuditLog } from './audit.schema';
import { buildPdfReportData } from './pdf-report-data.mapper';

@Injectable()
export class PdfReportDataService {
  constructor(
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLog>,
    @InjectModel(Location.name) private readonly locations: Model<Location>,
  ) {}

  async build(sessionId: string): Promise<Record<string, unknown>> {
    let session = await this.sessions.findOne({ sessionId }).exec();
    // Existing callers may still pass the internal MongoDB identifier.
    if (!session && /^[a-f\d]{24}$/i.test(sessionId)) {
      session = await this.sessions.findById(sessionId).exec();
    }
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const publicSessionId = session.sessionId;
    const [auditLogs, locations, qrCodeDataUrl] = await Promise.all([
      this.auditLogs.find({ sessionId: publicSessionId }).sort({ timestamp: 1 }).exec(),
      this.locations.find({ sessionId: publicSessionId }).sort({ timestamp: 1 }).exec(),
      QRCode.toDataURL(session.qrId, { width: 200, margin: 2 }),
    ]);

    return buildPdfReportData({
      session,
      auditLogs,
      locations,
      qrCodeDataUrl,
    });
  }
}

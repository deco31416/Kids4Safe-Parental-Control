import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { Session, SessionDocument } from '../session/session.schema';
import { Subject, SubjectDocument } from './subject.schema';

export interface AdminActor {
  userId?: string;
  username?: string;
}

export interface UpsertSessionSubjectPayload {
  subjectId?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  avatarDataUrl?: string;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name)
    private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly mediaStorage: MediaStorageService,
    private readonly auditService: AuditService,
  ) {}

  private validateAvatarDataUrl(avatarDataUrl?: string) {
    if (!avatarDataUrl) return undefined;

    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/.test(avatarDataUrl)) {
      throw new BadRequestException('Formato de foto no permitido');
    }

    if (avatarDataUrl.length > 5_600_000) {
      throw new BadRequestException('La foto supera el tamano maximo permitido');
    }

    return avatarDataUrl;
  }

  private normalizePayload(payload: UpsertSessionSubjectPayload) {
    const normalized: {
      displayName?: string;
      phone?: string;
      email?: string;
      notes?: string;
      tags?: string[];
    } = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'displayName')) {
      normalized.displayName = payload.displayName?.trim() || '';
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
      normalized.phone = payload.phone?.trim() || '';
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      normalized.email = payload.email?.trim().toLowerCase() || '';
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
      normalized.notes = payload.notes?.trim() || '';
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
      normalized.tags = Array.isArray(payload.tags)
        ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20)
        : [];
    }

    return normalized;
  }

  private sanitizeSubject(subject: any) {
    if (!subject) return subject;
    const plain = typeof subject.toObject === 'function' ? subject.toObject() : { ...subject };
    if (plain.photoPublicId) {
      plain.photoUrl = this.mediaStorage.getSignedUrl(plain.photoPublicId);
      plain.photoThumbnailUrl = plain.photoUrl;
    }
    delete plain.photoPublicId;
    delete plain.createdBy;
    delete plain.updatedBy;
    return plain;
  }

  async list(options?: { page?: string | number; limit?: string | number; search?: string }) {
    const requestedLimit = Number(options?.limit || 20);
    const requestedPage = Number(options?.page || 1);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 20, 1), 100);
    const page = Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1);
    const skip = (page - 1) * limit;
    const query: Record<string, any> = {};

    const search = String(options?.search || '').trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { displayName: regex },
        { phone: regex },
        { email: regex },
        { notes: regex },
        { tags: regex },
        { linkedQrIds: regex },
        { linkedSessionIds: regex },
      ];
    }

    const [subjects, total] = await Promise.all([
      this.subjectModel
        .find(query)
        .select('displayName phone email notes tags photoUrl photoThumbnailUrl linkedQrIds linkedSessionIds lastAssignedAt createdAt updatedAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.subjectModel.countDocuments(query).exec(),
    ]);

    return {
      subjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + subjects.length < total,
      },
    };
  }

  private async syncSubjectSessionSnapshots(subject: SubjectDocument, actorInfo: AdminActor) {
    await this.sessionModel.updateMany(
      { 'subject.subjectId': String(subject._id) },
      {
        $set: {
          'subject.displayName': subject.displayName,
          'subject.photoUrl': subject.photoUrl,
          'subject.photoThumbnailUrl': subject.photoThumbnailUrl,
          'subject.assignedBy': actorInfo,
        },
      },
    );
  }

  async getForSession(sessionId: string) {
    const session = await this.sessionModel
      .findOne({ sessionId })
      .select('sessionId qrId source subject')
      .lean()
      .exec();

    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }

    const subjectId = session.subject?.subjectId;
    if (!subjectId) {
      return { subject: null, sessionSubject: null };
    }

    const subject = await this.subjectModel.findById(subjectId).lean().exec();
    return {
      subject: this.sanitizeSubject(subject),
      sessionSubject: session.subject,
    };
  }

  async upsertForSession(sessionId: string, payload: UpsertSessionSubjectPayload, actor: AdminActor) {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }

    const isMobileAppSession = session.source === 'mobile-app' || session.qrId?.startsWith('mobile-direct:');
    if (isMobileAppSession) {
      throw new BadRequestException('Esta sesion usa perfil de app movil, no identidad QR/link');
    }

    const normalized = this.normalizePayload(payload);
    const avatarDataUrl = this.validateAvatarDataUrl(payload.avatarDataUrl);
    const existingSubjectId = payload.subjectId || session.subject?.subjectId;
    const actorInfo = {
      adminId: actor.userId,
      username: actor.username,
    };

    let subject: SubjectDocument | null = null;

    if (existingSubjectId) {
      if (!Types.ObjectId.isValid(existingSubjectId)) {
        throw new BadRequestException('Identidad invalida');
      }

      subject = await this.subjectModel.findById(existingSubjectId).exec();
      if (!subject) {
        throw new NotFoundException('Identidad no encontrada');
      }
    }

    if (!subject) {
      if (!normalized.displayName) {
        throw new BadRequestException('El nombre es obligatorio');
      }

      subject = await this.subjectModel.create({
        ...normalized,
        source: 'qr-link',
        linkedQrIds: [session.qrId],
        linkedSessionIds: [sessionId],
        createdBy: actorInfo,
        updatedBy: actorInfo,
        lastAssignedAt: new Date(),
      });
    } else {
      if (Object.prototype.hasOwnProperty.call(normalized, 'displayName')) {
        if (!normalized.displayName) {
          throw new BadRequestException('El nombre no puede estar vacio');
        }
        subject.displayName = normalized.displayName;
      }
      if (Object.prototype.hasOwnProperty.call(normalized, 'phone')) {
        subject.phone = normalized.phone;
      }
      if (Object.prototype.hasOwnProperty.call(normalized, 'email')) {
        subject.email = normalized.email;
      }
      if (Object.prototype.hasOwnProperty.call(normalized, 'notes')) {
        subject.notes = normalized.notes;
      }
      if (Object.prototype.hasOwnProperty.call(normalized, 'tags')) {
        subject.tags = normalized.tags;
      }
      subject.updatedBy = actorInfo;
      subject.lastAssignedAt = new Date();
      subject.linkedQrIds = Array.from(new Set([...(subject.linkedQrIds || []), session.qrId]));
      subject.linkedSessionIds = Array.from(new Set([...(subject.linkedSessionIds || []), sessionId]));
    }

    if (avatarDataUrl) {
      const previousPublicId = subject.photoPublicId;
      const upload = await this.mediaStorage.uploadSubjectAvatar(String(subject._id), avatarDataUrl);
      subject.photoUrl = upload.url;
      subject.photoThumbnailUrl = upload.thumbnailUrl;
      subject.photoPublicId = upload.publicId;

      if (previousPublicId && previousPublicId !== upload.publicId) {
        await this.mediaStorage.deleteFile(previousPublicId).catch(() => {});
      }
    }

    await subject.save();
    await this.syncSubjectSessionSnapshots(subject, actorInfo);

    session.subject = {
      subjectId: String(subject._id),
      displayName: subject.displayName,
      photoUrl: subject.photoUrl,
      photoThumbnailUrl: subject.photoThumbnailUrl,
      assignedAt: new Date(),
      assignedBy: actorInfo,
    } as any;
    await session.save();

    await this.auditService.log({
      eventType: 'QR_LINK_SUBJECT_ASSIGNED',
      actorType: 'admin',
      actorId: actor.userId,
      actorUsername: actor.username,
      qrId: session.qrId,
      sessionId,
      severity: 'info',
      metadata: {
        subjectId: String(subject._id),
        displayName: subject.displayName,
      },
    });

    return {
      subject: this.sanitizeSubject(subject),
      sessionSubject: session.subject,
    };
  }

  async updateSubject(subjectId: string, payload: UpsertSessionSubjectPayload, actor: AdminActor) {
    if (!Types.ObjectId.isValid(subjectId)) {
      throw new BadRequestException('Identidad invalida');
    }

    const subject = await this.subjectModel.findById(subjectId).exec();
    if (!subject) {
      throw new NotFoundException('Identidad no encontrada');
    }

    const normalized = this.normalizePayload(payload);
    const avatarDataUrl = this.validateAvatarDataUrl(payload.avatarDataUrl);
    const actorInfo = {
      adminId: actor.userId,
      username: actor.username,
    };

    if (Object.prototype.hasOwnProperty.call(normalized, 'displayName')) {
      if (!normalized.displayName) {
        throw new BadRequestException('El nombre no puede estar vacio');
      }
      subject.displayName = normalized.displayName;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'phone')) {
      subject.phone = normalized.phone;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'email')) {
      subject.email = normalized.email;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'notes')) {
      subject.notes = normalized.notes;
    }
    if (Object.prototype.hasOwnProperty.call(normalized, 'tags')) {
      subject.tags = normalized.tags;
    }

    subject.updatedBy = actorInfo;

    if (avatarDataUrl) {
      const previousPublicId = subject.photoPublicId;
      const upload = await this.mediaStorage.uploadSubjectAvatar(String(subject._id), avatarDataUrl);
      subject.photoUrl = upload.url;
      subject.photoThumbnailUrl = upload.thumbnailUrl;
      subject.photoPublicId = upload.publicId;

      if (previousPublicId && previousPublicId !== upload.publicId) {
        await this.mediaStorage.deleteFile(previousPublicId).catch(() => {});
      }
    }

    await subject.save();
    await this.syncSubjectSessionSnapshots(subject, actorInfo);

    await this.auditService.log({
      eventType: 'QR_LINK_SUBJECT_UPDATED_BY_ADMIN',
      actorType: 'admin',
      actorId: actor.userId,
      actorUsername: actor.username,
      severity: 'info',
      metadata: {
        subjectId: String(subject._id),
        fields: Object.keys(normalized),
      },
    });

    return this.sanitizeSubject(subject);
  }
}

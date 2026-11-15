import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { Session, SessionDocument } from '../session/session.schema';
import { Subject, SubjectDocument } from './subject.schema';
import { AdminActor } from './subjects.service';

@Injectable()
export class SubjectPhotoRemovalService {
  constructor(
    @InjectModel(Subject.name) private readonly subjects: Model<SubjectDocument>,
    @InjectModel(Session.name) private readonly sessions: Model<SessionDocument>,
    private readonly storage: MediaStorageService,
    private readonly audit: AuditService,
  ) {}

  async remove(subjectId: string, actor: AdminActor) {
    if (!Types.ObjectId.isValid(subjectId)) throw new BadRequestException('Identidad invalida');
    const subject = await this.subjects.findById(subjectId).lean().exec();
    if (!subject) throw new NotFoundException('Identidad no encontrada');

    const updated = await this.subjects.findByIdAndUpdate(
      subjectId,
      {
        $unset: { photoPublicId: 1, photoThumbnailUrl: 1, photoUrl: 1 },
        $set: { updatedBy: { adminId: actor.userId, username: actor.username } },
      },
      { new: true },
    ).lean().exec();
    await this.sessions.updateMany(
      { 'subject.subjectId': subjectId },
      { $unset: { 'subject.photoUrl': 1, 'subject.photoThumbnailUrl': 1 } },
    ).exec();
    if (subject.photoPublicId?.startsWith('profiles/subjects/')) {
      await this.storage.deleteFile(subject.photoPublicId);
    }
    await this.audit.log({
      eventType: 'QR_LINK_SUBJECT_PHOTO_REMOVED_BY_ADMIN',
      actorType: 'admin', actorId: actor.userId, actorUsername: actor.username,
      severity: 'info', metadata: { subjectId },
    });
    if (!updated) return updated;
    const safe = { ...updated } as Record<string, unknown>;
    delete safe.photoPublicId; delete safe.createdBy; delete safe.updatedBy;
    return safe;
  }
}

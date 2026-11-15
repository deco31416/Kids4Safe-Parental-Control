import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { Session, SessionSchema } from '../session/session.schema';
import { Subject, SubjectSchema } from './subject.schema';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { SubjectPhotoRemovalService } from './subject-photo-removal.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subject.name, schema: SubjectSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    AuditModule,
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService, SubjectPhotoRemovalService],
  exports: [SubjectsService],
})
export class SubjectsModule {}

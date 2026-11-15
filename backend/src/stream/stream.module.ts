import { Module } from '@nestjs/common';
import { StreamGateway } from './stream.gateway';
import { SessionModule } from '../session/session.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SessionModule, AuthModule],
  providers: [StreamGateway],
})
export class StreamModule {}

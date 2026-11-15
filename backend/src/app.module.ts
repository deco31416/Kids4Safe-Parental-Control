import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionModule } from './session/session.module';
import { QRModule } from './qr/qr.module';
import { StreamModule } from './stream/stream.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuditModule } from './audit/audit.module';
import { RecordingsModule } from './recordings/recordings.module';
import { LiveModule } from './live/live.module';
import { LocationModule } from './location/location.module';
import { AdminModule } from './admin/admin.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { AudioClipsModule } from './audio-clips/audio-clips.module';
import { NotificationModule } from './notification/notification.module';
import { configValidationSchema } from './config/config.schema';
import { PluginModeModule } from './config/plugin-mode.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { MobileModule } from './mobile/mobile.module';
import { MobileAuthModule } from './mobile-auth/mobile-auth.module';
import { MobileProfileModule } from './mobile-profile/mobile-profile.module';
import { SubjectsModule } from './subjects/subjects.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { StorageModule } from './storage/storage.module';
import { StorageRetentionModule } from './storage/storage-retention.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
      validationSchema: configValidationSchema, // ✅ Validación Joi
      validationOptions: {
        abortEarly: false, // Mostrar TODOS los errores
        allowUnknown: true, // Railway inyecta variables adicionales
      },
    }),
    PluginModeModule, // 🔌 Global plugin mode configuration
    FeatureFlagsModule, // 🚩 Feature flags en DB (P0)
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/QR-MONITOR',
      {
        retryAttempts: 5,
        retryDelay: 1000,
      }
    ),
    ScheduleModule.forRoot(), // ✅ Para cron jobs (SessionMonitorService)
    AuthModule,
    SessionModule,
    QRModule,
    StreamModule,
    HealthModule,
    RealtimeModule,   // 🎥 WebRTC signaling
    AuditModule,      // 📋 Logs legales
    RecordingsModule, // 🎬 Grabaciones filesystem
    LiveModule,       // 📍 Live endpoints (ubicación, sensores)
    LocationModule,   // 🗺️ Location service client
    AdminModule,      // 👥 Admin endpoints (ruta, stats, export)
    ScreenshotsModule, // 📸 Screenshots storage
    AudioClipsModule, // 🎤 Audio clips storage
    NotificationModule, // 🔔 Sistema de notificaciones (admin + push usuarios)
    MobileModule, // 📱 Entradas exclusivas de app móvil
    MobileAuthModule, // Usuarios finales de app móvil separados del auth admin
    MobileProfileModule, // 🪪 Perfil de emergencia de unidades móviles
    SubjectsModule, // Identidades asignadas a sesiones QR/link
    WebrtcModule, // ICE/TURN servers para WebRTC
    StorageModule, // Archivos locales/Railway Volume
    StorageRetentionModule, // Retención física antes del TTL de Mongo
  ],
})
export class AppModule {}

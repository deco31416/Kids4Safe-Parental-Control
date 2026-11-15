import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module';
import { getAllowedCorsOrigins } from './config/cors-origins';
import { requestDiagnosticsMiddleware } from './config/request-diagnostics.middleware';
import { configureSwagger } from './config/swagger';
import { config } from 'dotenv';
import { resolve } from 'path';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

// Polyfill para runtimes donde globalThis.crypto no existe (p.ej. Node < 20)
// @nestjs/schedule usa crypto.randomUUID() a través de la API global.
import { randomUUID, webcrypto } from 'crypto';

const globalAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
if (!globalAny.crypto) {
  globalAny.crypto = webcrypto as unknown as { randomUUID?: () => string };
}
if (!globalAny.crypto.randomUUID) {
  globalAny.crypto.randomUUID = randomUUID;
}

if (process.env.LOG_RUNTIME_INFO === 'true') {
  // Útil para diagnosticar Railway sin depender de interpretaciones de logs.
  // El número en [Nest] X o (node:X) es PID, no versión de Node.
  console.log('NODE VERSION:', process.version);
  console.log('NODE PID:', process.pid);
  console.log('HAS globalThis.crypto:', !!globalThis.crypto);
  console.log('HAS crypto.randomUUID:', typeof globalThis.crypto?.randomUUID);
}

// Cargar la configuración local sin interferir con variables inyectadas por Railway.
config({ path: resolve(__dirname, '..', '.env.local'), override: false });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  // ✅ Confiar en proxy (Railway, nginx, etc.) - Obtener instancia de Express
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.use(requestDiagnosticsMiddleware);

  // Seguridad - P1 #6: CSP configurado para WebRTC/WebSocket
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "wss:", "ws:", process.env.REALTIME_URL || 'http://localhost:5000'],
        mediaSrc: ["'self'", "blob:", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necesario para WebRTC
  }));
  
  // Rate limiting - más permisivo para desarrollo
  const mobileEmergencyStartLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: Number(process.env.MOBILE_EMERGENCY_START_RATE_LIMIT || 12),
    message: 'Demasiados inicios de emergencia móvil desde esta IP, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/mobile/emergency/start', mobileEmergencyStartLimiter);

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto (reducido de 15)
    max: 200, // límite de 200 requests por IP (aumentado de 100)
    message: 'Demasiadas peticiones desde esta IP, intenta más tarde',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use(limiter);

  // Validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS
  app.enableCors({
    origin: getAllowedCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'x-request-id',
      'X-Mobile-Session-Token',
      'X-Mobile-Unit-Token',
      'X-Publisher-Session-Token',
      'X-Session-Id',
    ],
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(process.env.REDIS_URL);
  app.useWebSocketAdapter(redisIoAdapter);

  configureSwagger(app);

  const port = process.env.PORT || 7000;
  await app.listen(port);
  
  console.log(`🚀 Backend corriendo en http://localhost:${port}`);
  console.log(`📚 Swagger disponible en http://localhost:${port}/api/docs`);
  console.log(`🔐 MongoDB: ${process.env.MONGODB_URI ? '✅ Configurado (URI oculta por seguridad)' : '⚠️ No configurado'}`);
}

bootstrap().catch(err => {
  console.error('❌ Error fatal al iniciar el servidor:', err);
  process.exit(1);
});

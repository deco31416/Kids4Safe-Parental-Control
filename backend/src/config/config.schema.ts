import * as Joi from 'joi';

/**
 * Schema de validación para variables de entorno
 * Ejecutado en app.module.ts via ConfigModule.forRoot({ validationSchema })
 * 
 * ⚠️ Railway NO usa Docker - Variables se configuran en Railway Dashboard
 */
export const configValidationSchema = Joi.object({
  // ════════════════════════════════════════════════════════════════
  // 🔐 AUTENTICACIÓN Y SEGURIDAD
  // ════════════════════════════════════════════════════════════════
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret para firmar JWT tokens (min 32 caracteres)'),

  JWT_EXPIRES_IN: Joi.string()
    .default('7d')
    .description('Duración de JWT tokens (ej: 7d, 24h)'),

  ADMIN_EMAIL: Joi.string()
    .email()
    .required()
    .description('Email del administrador principal'),

  ADMIN_PASSWORD: Joi.string()
    .min(8)
    .required()
    .description('Password del admin (min 8 caracteres)'),

  ADMIN_API_KEY: Joi.string()
    .min(32)
    .required()
    .description('API key compartida para admin panel y microservicios internos'),

  SEED_ADMIN_EMAIL: Joi.string()
    .email()
    .default('admin@qr-deco.local'),

  SEED_VIEWER_EMAIL: Joi.string()
    .email()
    .default('viewer@qr-deco.local'),

  SEED_ADMIN_PASSWORD: Joi.string()
    .min(8)
    .optional(),

  SEED_VIEWER_PASSWORD: Joi.string()
    .min(8)
    .optional(),

  // ════════════════════════════════════════════════════════════════
  // 🗄️ BASES DE DATOS (Railway MongoDB & Redis)
  // ════════════════════════════════════════════════════════════════
  MONGODB_URI: Joi.string()
    .uri()
    .required()
    .description('Railway MongoDB connection string'),

  REDIS_URL: Joi.string()
    .uri()
    .required()
    .description('Railway Redis connection string'),

  REDIS_KEY_PREFIX: Joi.string()
    .optional()
    .allow('')
    .description('Prefijo opcional para aislar llaves Redis por entorno'),

  // ════════════════════════════════════════════════════════════════
  // 🚀 SERVIDOR Y ENTORNO
  // ════════════════════════════════════════════════════════════════
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Entorno de ejecución'),

  RUN_SEEDS: Joi.boolean()
    .default(false)
    .description('Ejecutar seeds únicamente con autorización explícita'),

  ALLOW_USER_RESET: Joi.boolean()
    .default(false)
    .description('Autorizar reset destructivo de usuarios únicamente en local'),

  ALLOW_USER_FIX: Joi.boolean()
    .default(false)
    .description('Autorizar actualización masiva de usuarios únicamente en local'),

  PORT: Joi.number()
    .port()
    .default(3001)
    .description('Puerto del servidor NestJS (Railway auto-asigna)'),

  FRONTEND_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('URL del Frontend Next.js (para CORS)'),

  ADMIN_URL: Joi.string()
    .uri()
    .optional()
    .description('URL del Admin Panel (para CORS)'),

  ADMIN_PANEL_URL: Joi.string()
    .uri()
    .optional()
    .description('URL del Admin Panel (para CORS)'),

  MOBILE_APP_URL: Joi.string()
    .uri()
    .optional()
    .description('URL web de la app movil Expo (para CORS)'),

  CORS_ORIGIN: Joi.string()
    .optional()
    .description('Lista separada por comas de origenes web adicionales'),

  METERED_TURN_APP_NAME: Joi.string()
    .optional()
    .description('Metered app name para TURN, ejemplo kids4safe'),

  METERED_TURN_SECRET_KEY: Joi.string()
    .optional()
    .description('Metered Secret Key. Solo backend, nunca exponer al cliente.'),

  METERED_TURN_CREDENTIAL_API_KEY: Joi.string()
    .optional()
    .description('Metered credential API key para obtener ICE servers si se requiere'),

  METERED_TURN_CREDENTIAL_TTL_SECONDS: Joi.number()
    .integer()
    .min(600)
    .max(86400)
    .default(7200)
    .description('Duración de credenciales TURN temporales por sesión'),

  METERED_TURN_USERNAME: Joi.string()
    .optional()
    .description('Usuario de la credencial TURN activa'),

  METERED_TURN_PASSWORD: Joi.string()
    .allow('', null)
    .optional()
    .description('Password de la credencial TURN activa. Solo backend, nunca exponer como env publico.'),

  METERED_TURN_REGION: Joi.string()
    .default('South America')
    .description('Region Metered seleccionada'),

  METERED_TURN_PLAN_NAME: Joi.string()
    .default('Free Trial Global')
    .description('Nombre del plan Metered TURN'),

  METERED_TURN_QUOTA_GB: Joi.number()
    .default(0.5)
    .description('Cuota mensual TURN en GB'),

  METERED_TURN_PERIOD_END: Joi.string()
    .optional()
    .description('Fecha de renovacion/corte del plan TURN, ISO o YYYY-MM-DD'),

  WEBRTC_ICE_SERVERS_JSON: Joi.string()
    .allow('', null)
    .optional()
    .description('Fallback backend para ICE servers en JSON. Preferir Metered credential API.'),

  WEB_PUSH_VAPID_PUBLIC_KEY: Joi.string()
    .allow('', null)
    .optional()
    .description('Clave publica VAPID para Web Push en frontend web'),

  WEB_PUSH_VAPID_PRIVATE_KEY: Joi.string()
    .allow('', null)
    .optional()
    .description('Clave privada VAPID para enviar Web Push desde backend'),

  WEB_PUSH_VAPID_SUBJECT: Joi.string()
    .allow('', null)
    .optional()
    .description('Contacto VAPID, ejemplo mailto:admin@kids4safe.example'),

  // ════════════════════════════════════════════════════════════════
  // 🐍 MICROSERVICIOS PYTHON (Railway Services)
  // ════════════════════════════════════════════════════════════════
  // Nota: Railway genera URLs automáticamente al deployar
  // Configure la URL privada del servicio en el entorno de ejecución.

  DEVICE_INFO_URL: Joi.string()
    .uri()
    .default('http://localhost:5001')
    .description('Microservicio device-info (Railway)'),

  LOCATION_URL: Joi.string()
    .uri()
    .default('http://localhost:5002')
    .description('Microservicio location-geofence (Railway)'),

  LOCATION_TRACK_URL: Joi.string()
    .uri()
    .default('http://localhost:5008')
    .description('Microservicio location-track (Railway)'),

  POLICY_ENGINE_URL: Joi.string()
    .uri()
    .default('http://localhost:5007')
    .description('Microservicio policy-engine (Railway)'),

  POLICY_ENGINE_SERVICE_URL: Joi.string()
    .uri()
    .optional()
    .description('Alias Railway para el microservicio policy-engine'),

  AUDIT_LOG_URL: Joi.string()
    .uri()
    .default('http://localhost:5006')
    .description('Microservicio audit-log (Railway)'),

  SESSION_ORCHESTRATOR_URL: Joi.string()
    .uri()
    .default('http://localhost:5005')
    .description('Microservicio session-orchestrator (Railway)'),

  SESSION_ORCHESTRATOR_SERVICE_URL: Joi.string()
    .uri()
    .optional()
    .description('Alias Railway para el microservicio session-orchestrator'),

  SCREEN_RECORDER_URL: Joi.string()
    .uri()
    .default('http://localhost:5003')
    .description('Microservicio screen-recorder (Railway)'),

  IP_CLASSIFIER_URL: Joi.string()
    .uri()
    .default('http://localhost:5009')
    .description('Microservicio IP classifier GPS/IP (Railway)'),

  MEDIA_STORAGE_ROOT: Joi.string()
    .optional()
    .description('Raíz filesystem local; Railway usa RAILWAY_VOLUME_MOUNT_PATH'),

  MEDIA_MAX_FILE_BYTES: Joi.number()
    .integer()
    .min(1024)
    .default(104857600)
    .description('Tamaño máximo permitido por archivo'),

  MEDIA_SIGNING_SECRET: Joi.string()
    .min(32)
    .optional()
    .description('Secreto opcional para firmar URLs; usa JWT_SECRET si falta'),

  MEDIA_URL_TTL_SECONDS: Joi.number().integer().min(60).max(86400).default(3600),

  RAILWAY_VOLUME_MOUNT_PATH: Joi.string()
    .optional()
    .description('Ruta inyectada automáticamente por Railway Volume'),

  // ════════════════════════════════════════════════════════════════
  // 🌍 GEOLOCALIZACIÓN IP (APIs gratuitas)
  // ════════════════════════════════════════════════════════════════
  // ip-api.com (45 req/min) - NO requiere key
  // ipapi.co (1000 req/day) - NO requiere key
  // ipgeolocation.io (30k req/month) - Opcional key

  IPGEOLOCATION_API_KEY: Joi.string()
    .allow('', null)
    .optional()
    .description('API key opcional para ipgeolocation.io (30k req/month)'),

  // ════════════════════════════════════════════════════════════════
  // � MODO PLUGIN - MICROSERVICIOS OPCIONALES (FASE 1)
  // ════════════════════════════════════════════════════════════════
  // Default: false (lógica local)
  // true = Backend usa microservicio | false = Backend usa lógica local
  
  USE_POLICY_ENGINE: Joi.boolean()
    .default(false)
    .description('🔌 Usar microservicio policy-engine o lógica local'),

  USE_SESSION_ORCHESTRATOR: Joi.boolean()
    .default(false)
    .description('🔌 Usar microservicio session-orchestrator o Redis/MongoDB directo'),

  USE_IP_CLASSIFIER: Joi.boolean()
    .default(false)
    .description('🔌 Usar microservicio IP classifier o geolocalización local'),

  USE_DEVICE_INFO: Joi.boolean()
    .default(false)
    .description('🔌 Usar microservicio device-info o datos frontend directo'),

  // ML TRIANGULATION (retirado hasta tener microservicio real)
  USE_ML_TRIANGULATION: Joi.boolean()
    .default(false)
    .description('Usar ML triangulation solo si existe un microservicio real configurado'),

  ML_TRIANGULATION_URL: Joi.string()
    .uri()
    .allow('', null)
    .optional()
    .description('URL opcional del microservicio ML triangulation'),

  ML_TRIANGULATION_TIMEOUT: Joi.number()
    .default(2000)
    .description('Timeout para ML triangulation en ms (nunca bloqueante)'),

  // ════════════════════════════════════════════════════════════════
  // 🔧 CONFIGURACIÓN ADICIONAL
  // ════════════════════════════════════════════════════════════════
  RATE_LIMIT_TTL: Joi.number()
    .default(60)
    .description('Rate limit TTL en segundos'),

  RATE_LIMIT_MAX: Joi.number()
    .default(100)
    .description('Máximo requests por TTL'),

  SESSION_MAX_DURATION: Joi.number()
    .default(3600)
    .description('Duración máxima sesión en segundos (default: 1 hora)'),

  ACTIVE_SESSION_STALE_MS: Joi.number()
    .default(300000)
    .description('Tiempo sin heartbeat antes de sacar una sesión de la lista activa'),

  ENABLE_AUDIT_LOGS: Joi.boolean()
    .default(true)
    .description('Habilitar logs de auditoría'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info')
    .description('Nivel de logging'),

  DATA_RETENTION_DAYS: Joi.number()
    .default(30)
    .description('Días de retención para LocationHistory y Recordings (TTL MongoDB)'),
});

/**
 * Validación manual para testing (sin ConfigModule)
 */
export function validateEnv(env: Record<string, any>): void {
  const { error, value } = configValidationSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true, // Railway inyecta vars adicionales
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message).join('\n  - ');
    throw new Error(`❌ Configuración de entorno inválida:\n  - ${errors}`);
  }

  console.log('✅ Variables de entorno validadas correctamente');
}


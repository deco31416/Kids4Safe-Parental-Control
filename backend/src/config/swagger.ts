import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Kids4Safe API')
    .setDescription('Sistema de monitoreo remoto con QR codes - API REST segura')
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Autenticacion', 'Login y gestion de usuarios')
    .addTag('QR Codes', 'Gestion de codigos QR')
    .addTag('Sesiones', 'Gestion de sesiones de usuario')
    .addTag('Streaming', 'Senalizacion WebSocket/WebRTC')
    .addTag('Health Check', 'Monitoreo de servicios y microservicios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Kids4Safe API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });
}

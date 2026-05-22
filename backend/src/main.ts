import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: 'http://localhost:3000' });

  // ── Swagger setup ──────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('VGMS NestJS API')
    .setDescription(
      'Visitor & Gate Pass Management System — NestJS backend REST API. ' +
      'Reuses the same DrizzleORM schema and PostgreSQL database as the Next.js app. ' +
      'All endpoints are available at http://localhost:4000/api'
    )
    .setVersion('1.0')
    .addTag('health',   'Health check endpoint')
    .addTag('users',    'User management — 5 CRUD endpoints')
    .addTag('visitors', 'Visitor management — 5 CRUD endpoints')
    .addServer('http://localhost:4000', 'Local development')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    customSiteTitle: 'VGMS API Docs',
  });
  // ──────────────────────────────────────────────────────────────

  const port = process.env.NEST_PORT ?? 4000;
  await app.listen(port);

  console.log(`\n🚀 VGMS NestJS backend running at http://localhost:${port}/api`);
  console.log(`   Users    → http://localhost:${port}/api/users`);
  console.log(`   Visitors → http://localhost:${port}/api/visitors`);
  console.log(`   Health   → http://localhost:${port}/api/health`);
  console.log(`   Docs     → http://localhost:${port}/api/docs\n`);
}

bootstrap();

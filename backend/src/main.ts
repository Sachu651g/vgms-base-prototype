import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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
  const port = process.env.NEST_PORT ?? 4000;
  await app.listen(port);
  console.log(`\n🚀 VGMS NestJS backend running at http://localhost:${port}/api`);
  console.log(`   Users  → http://localhost:${port}/api/users`);
  console.log(`   Health → http://localhost:${port}/api/health\n`);
}
bootstrap();

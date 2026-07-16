import compression from '@fastify/compress';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyRawBody from 'fastify-raw-body';
import { getApps, initializeApp } from 'firebase-admin/app';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const startInstant = Temporal.Now.instant();

  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'coaster-437f2',
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: isProduction ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.register(helmet);

  await app.register(compression, { encodings: ['gzip', 'deflate'] });

  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/public/',
  });

  await app.register(fastifyRawBody, {
    field: 'rawBody',
    encoding: 'utf8',
    global: false,
    runFirst: true,
    routes: ['/api/v1/billing/webhook'],
  });

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;

  const config = new DocumentBuilder()
    .setTitle('BarTeam API')
    .setDescription('API Multi-Tenant para la gestión de bares y turnos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Time from bootstrap to start: ${startInstant.until(Temporal.Now.instant()).toLocaleString()}`);
}

void bootstrap();

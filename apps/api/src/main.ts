import compression from '@fastify/compress';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import {
  BETA_ALLOWLIST_ENABLED,
  CORS_ORIGINS,
  isBetaAllowlistEnabled,
  PUBLIC_ROOT,
  resolveCorsOrigins,
} from '@coaster/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyRawBody from 'fastify-raw-body';
import { getApps, initializeApp } from 'firebase-admin/app';
import { AppModule } from './app.module';

async function bootstrap() {
  const startInstant = Temporal.Now.instant();

  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.GCLOUD_PROJECT || 'coaster-437f2',
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  const hops = Number.isFinite(proxyHops) && proxyHops > 0 ? proxyHops : 0;
  const trustProxy = hops > 0 ? (_address: string, hop: number) => hop < hops : false;

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy }), {
    logger: isProduction ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.register(helmet);

  await app.register(compression, { encodings: ['gzip', 'deflate'] });

  await app.register(fastifyStatic, {
    root: PUBLIC_ROOT,
    prefix: '/public/',
  });

  await app.register(fastifyRawBody, {
    field: 'rawBody',
    encoding: 'utf8',
    global: false,
    runFirst: true,
    routes: ['/api/v1/stripe/webhook'],
  });

  const corsOrigins = resolveCorsOrigins(process.env[CORS_ORIGINS], isProduction);

  if (corsOrigins.length === 0) {
    Logger.error(`${CORS_ORIGINS} is not set: every cross-origin request will be refused`);
  }

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Last-Event-ID'],
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

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('BarTeam API')
      .setDescription('API multi-tenant para la gestión de establecimientos y turnos')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  if (isBetaAllowlistEnabled(process.env[BETA_ALLOWLIST_ENABLED])) {
    Logger.warn('Beta allowlist is ON: only emails on the BetaTester table can open a new account');
  }

  await app.listen(port, '0.0.0.0');

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`Time from bootstrap to start: ${startInstant.until(Temporal.Now.instant()).toLocaleString()}`);
}

void bootstrap();

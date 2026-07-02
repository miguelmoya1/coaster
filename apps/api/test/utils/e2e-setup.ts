import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../src/auth';
import { DbService } from '../../src/core/db';

export const mockUser = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'test@example.com',
  name: 'Test User',
  active: true,
  role: 'USER',
};

export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Inject the mock user
    request.user = { ...mockUser };
    return true;
  }
}

export class E2eTestSetup {
  public app!: NestFastifyApplication;
  public prisma!: DbService;

  async setup() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(OptionalFirebaseAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    this.app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    const { IoAdapter } = require('@nestjs/platform-socket.io');
    this.app.useWebSocketAdapter(new IoAdapter(this.app));
    this.app.setGlobalPrefix('api');
    
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();

    // Get Prisma Client from Nest DI
    this.prisma = this.app.get(DbService);
  }

  async teardown() {
    if (this.app) {
      await this.app.close();
    }
  }

  async clearDatabase() {
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"${name}"`)
      .join(', ');

    try {
      if (tables.length > 0) {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      }
    } catch (error) {
      console.log('Error clearing database:', error);
    }
  }
}

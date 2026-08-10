import { CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../src/auth';
import { DbService, DbEstablishmentRole, DbSubscriptionPlan, DbSubscriptionStatus } from '../../src/core/db';
import { WsAuthService } from '../../src/websockets/services';

const TRIAL_DAYS = 14;

export const mockUser = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'test@example.com',
  name: 'Test User',
  active: true,
  role: 'USER',
};

export class MockWsAuthService {
  authenticate(client: { handshake?: { auth?: { token?: unknown } } }): Promise<string | null> {
    const token = client?.handshake?.auth?.token;
    return Promise.resolve(typeof token === 'string' && token.length > 0 ? mockUser.id : null);
  }

  canAccessEstablishment(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

/** Tests that need a second person send `x-e2e-user-id`; everything else stays as `mockUser`. */
export class MockAuthGuard implements CanActivate {
  static readonly users = new Map<string, { id: string; email: string; name: string; role: string }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const header = request.headers?.['x-e2e-user-id'];
    const impersonated = typeof header === 'string' ? header : undefined;

    request.user = impersonated
      ? (MockAuthGuard.users.get(impersonated) ?? { ...mockUser, id: impersonated })
      : { ...mockUser };

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
      .overrideProvider(WsAuthService)
      .useClass(MockWsAuthService)
      .compile();

    this.app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
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

    this.prisma = this.app.get(DbService);
  }

  async createEstablishment(
    name = 'Test Establishment',
    options: { ownerId?: string | null; role?: DbEstablishmentRole } = {},
  ) {
    const ownerId = options.ownerId === undefined ? mockUser.id : options.ownerId;
    const role = options.role ?? DbEstablishmentRole.OWNER;

    return this.prisma.dbEstablishment.create({
      data: {
        name,
        ...(ownerId ? { members: { create: { userId: ownerId, role } } } : {}),
        billing: {
          create: {
            plan: DbSubscriptionPlan.FREE,
            status: DbSubscriptionStatus.TRIALING,
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
  }

  /** Registers a user the tests can act as with the `x-e2e-user-id` header. */
  actAs(user: { id: string; email: string; name: string; role?: string }) {
    MockAuthGuard.users.set(user.id, { role: 'USER', ...user });

    return { 'x-e2e-user-id': user.id };
  }

  async teardown() {
    if (this.app) {
      await this.app.close();
    }
  }

  async clearDatabase() {
    const tablenames = await this.prisma.$queryRaw<
      { tablename: string }[]
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

import { DEFAULT_ESTABLISHMENT_MODULES, EstablishmentModule, resolveModules } from '@coaster/common';
import { CanActivate, ExecutionContext, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import cookie from '@fastify/cookie';
import { AUTH_MAILER } from '@coaster/core';
import { AuthGuard, OptionalAuthGuard } from '../../src/auth';
import {
  DbService,
  DbEstablishmentModule,
  DbEstablishmentRole,
  DbSubscriptionPlan,
  DbSubscriptionStatus,
} from '../../src/core/db';

const TRIAL_DAYS = 14;

export const mockUser = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'test@example.com',
  name: 'Test User',
  active: true,
  role: 'USER',
};

/** Tests that need a second person send `x-e2e-user-id`; everything else stays as `mockUser`. */
export class MockAuthGuard implements CanActivate {
  static readonly users = new Map<string, { id: string; email: string; name: string; role: string }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: unknown;
      session?: unknown;
    }>();
    const header = request.headers?.['x-e2e-user-id'];
    const impersonated = typeof header === 'string' ? header : undefined;

    const user = impersonated
      ? (MockAuthGuard.users.get(impersonated) ?? { ...mockUser, id: impersonated })
      : { ...mockUser };

    request.user = user;
    request.session = { sub: user.id, sid: `e2e-session-${user.id}` };

    return true;
  }
}

export interface SentEmail {
  kind: 'invite' | 'verifyEmail' | 'resetPassword' | 'passwordChanged';
  to: string;
  token?: string;
}

/** Stands in for Resend, so the tests can follow the links instead of sending anything. */
export class TestMailbox {
  readonly sent: SentEmail[] = [];

  async sendInvite(to: string, invite: { token: string }) {
    this.sent.push({ kind: 'invite', to, token: invite.token });
  }

  async sendEmailVerification(to: string, _name: string, token: string) {
    this.sent.push({ kind: 'verifyEmail', to, token });
  }

  async sendPasswordReset(to: string, _name: string, token: string) {
    this.sent.push({ kind: 'resetPassword', to, token });
  }

  async sendPasswordChanged(to: string) {
    this.sent.push({ kind: 'passwordChanged', to });
  }

  lastOf(kind: SentEmail['kind']): SentEmail | undefined {
    return this.sent.filter((email) => email.kind === kind).at(-1);
  }

  clear() {
    this.sent.length = 0;
  }
}

export class E2eTestSetup {
  public app!: NestFastifyApplication;
  public prisma!: DbService;
  public readonly mailbox = new TestMailbox();

  async setup() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockAuthGuard)
      .overrideProvider(AUTH_MAILER)
      .useValue(this.mailbox)
      .compile();

    this.app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
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

    await this.app.register(cookie);

    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();

    this.prisma = this.app.get(DbService);
  }

  async createEstablishment(
    name = 'Test Establishment',
    options: { ownerId?: string | null; role?: DbEstablishmentRole; modules?: EstablishmentModule[] } = {},
  ) {
    const ownerId = options.ownerId === undefined ? mockUser.id : options.ownerId;
    const role = options.role ?? DbEstablishmentRole.OWNER;
    const modules = resolveModules(options.modules ?? DEFAULT_ESTABLISHMENT_MODULES);

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
        settings: { create: { modules: modules as DbEstablishmentModule[] } },
      },
    });
  }

  /** Registers a user the tests can act as with the `x-e2e-user-id` header. */
  actAs(user: { id: string; email: string; name: string; role?: string }) {
    MockAuthGuard.users.set(user.id, { role: 'USER', ...user });

    return { 'x-e2e-user-id': user.id };
  }

  /**
   * Inviting answers as soon as the command is accepted; the membership itself lands later, when the
   * saga behind it has run. Tests that look at the row have to wait for it instead of assuming the
   * response means it is there.
   */
  async waitForMembers(establishmentId: string, count: number) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const members = await this.prisma.dbEstablishmentMember.findMany({
        where: { establishmentId, deletedAt: null },
      });

      if (members.length >= count) {
        return members;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Establishment ${establishmentId} never reached ${count} members`);
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

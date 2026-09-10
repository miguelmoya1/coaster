import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REFRESH_COOKIE_NAME } from '../../src/auth';
import { hashPassword } from '../../src/auth/domain/password';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const EMAIL = 'olvidadiza@coaster.test';
const OLD_PASSWORD = 'la-contrasena-vieja';
const NEW_PASSWORD = 'la-contrasena-nueva';

describe('Account recovery (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();
    testSetup.mailbox.clear();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const server = () => testSetup.app.getHttpServer();

  const seedAccount = async (overrides: Record<string, unknown> = {}) =>
    testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: EMAIL,
        name: 'Olvidadiza',
        passwordHash: await hashPassword(OLD_PASSWORD),
        emailVerifiedAt: new Date(),
        ...overrides,
      },
    });

  const forgot = (email = EMAIL) => request(server()).post('/api/auth/forgot-password').send({ email });

  const login = (password: string) => request(server()).post('/api/auth/login').send({ email: EMAIL, password });

  describe('forgetting and resetting a password', () => {
    it('should answer the same to an address with an account and one without', async () => {
      await seedAccount();

      await forgot().expect(204);
      await forgot('nadie@coaster.test').expect(204);

      expect(testSetup.mailbox.sent.filter((email) => email.kind === 'resetPassword')).toHaveLength(1);
    });

    it('should carry the whole way: link, new password, signed in, warned, old sessions closed', async () => {
      const user = await seedAccount();

      await testSetup.prisma.dbAuthSession.create({
        data: {
          userId: user.id,
          tokenHash: 'ceb7b8dc55f5e2be2f5d9c0e0d5fcbb90bf7b6ee1a3b3f45c1a7e5f1e0a4b6d3',
          familyId: 'family-1',
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await forgot().expect(204);

      const token = testSetup.mailbox.lastOf('resetPassword')!.token!;

      const response = await request(server())
        .post('/api/auth/reset-password')
        .send({ token, password: NEW_PASSWORD })
        .expect(200);

      expect(response.body.user.email).toBe(EMAIL);
      expect((response.headers['set-cookie'] as unknown as string[]).join()).toContain(REFRESH_COOKIE_NAME);
      expect(testSetup.mailbox.lastOf('passwordChanged')?.to).toBe(EMAIL);

      await login(NEW_PASSWORD).expect(200);
      await login(OLD_PASSWORD).expect(401);

      const closed = await testSetup.prisma.dbAuthSession.findMany({ where: { familyId: 'family-1' } });

      expect(closed.every((session) => session.revokedAt !== null)).toBe(true);
    });

    it('should refuse to spend the same link twice', async () => {
      await seedAccount();
      await forgot().expect(204);

      const token = testSetup.mailbox.lastOf('resetPassword')!.token!;

      await request(server()).post('/api/auth/reset-password').send({ token, password: NEW_PASSWORD }).expect(200);
      await request(server()).post('/api/auth/reset-password').send({ token, password: 'otra-mas' }).expect(400);
    });

    it('should refuse a link nobody issued', async () => {
      await request(server())
        .post('/api/auth/reset-password')
        .send({ token: 'un-token-inventado', password: NEW_PASSWORD })
        .expect(400);
    });
  });

  describe('confirming the address', () => {
    it('should go out, come back and leave the address confirmed', async () => {
      await seedAccount({ emailVerifiedAt: null });

      await request(server()).post('/api/account/verify-email').expect(204);

      const token = testSetup.mailbox.lastOf('verifyEmail')!.token!;

      await request(server()).post('/api/auth/verify-email').send({ token }).expect(204);

      const stored = await testSetup.prisma.dbUser.findUnique({ where: { email: EMAIL } });

      expect(stored!.emailVerifiedAt).not.toBeNull();
    });

    it('should send nothing to somebody who confirmed already', async () => {
      await seedAccount();

      await request(server()).post('/api/account/verify-email').expect(204);

      expect(testSetup.mailbox.lastOf('verifyEmail')).toBeUndefined();
    });

    it('should refuse a link that was already used', async () => {
      await seedAccount({ emailVerifiedAt: null });
      await request(server()).post('/api/account/verify-email').expect(204);

      const token = testSetup.mailbox.lastOf('verifyEmail')!.token!;

      await request(server()).post('/api/auth/verify-email').send({ token }).expect(204);
      await request(server()).post('/api/auth/verify-email').send({ token }).expect(400);
    });
  });
});

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/domain/password';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const EMAIL = 'cuenta@coaster.test';
const PASSWORD = 'la-de-siempre';

describe('AccountController (e2e)', () => {
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
      data: { id: mockUser.id, email: EMAIL, name: 'Cuenta', emailVerifiedAt: new Date(), ...overrides },
    });

  const linkGoogle = (userId: string) =>
    testSetup.prisma.dbAuthIdentity.create({
      data: { userId, provider: 'GOOGLE', subject: '110000000000000000001', email: EMAIL },
    });

  describe('GET /account', () => {
    it('should say how this person can get in', async () => {
      const user = await seedAccount({ passwordHash: await hashPassword(PASSWORD) });
      await linkGoogle(user.id);

      const response = await request(server()).get('/api/account').expect(200);

      expect(response.body).toMatchObject({ email: EMAIL, emailVerified: true, hasPassword: true });
      expect(response.body.identities).toHaveLength(1);
      expect(response.body.identities[0]).toMatchObject({ provider: 'GOOGLE', email: EMAIL });
    });

    it('should never send the password hash back', async () => {
      await seedAccount({ passwordHash: await hashPassword(PASSWORD) });

      const response = await request(server()).get('/api/account').expect(200);

      expect(JSON.stringify(response.body)).not.toContain('argon2');
    });
  });

  describe('PUT /account/password', () => {
    it('should let somebody who only has Google set their first password, warn them and close the rest', async () => {
      const user = await seedAccount();
      await linkGoogle(user.id);

      await testSetup.prisma.dbAuthSession.create({
        data: {
          userId: user.id,
          tokenHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
          familyId: 'otra-sesion',
          expiresAt: new Date(Date.now() + 60_000),
        },
      });

      await request(server()).put('/api/account/password').send({ password: 'una-nueva-buena' }).expect(204);

      const stored = await testSetup.prisma.dbUser.findUnique({ where: { id: user.id } });

      await expect(verifyPassword(stored!.passwordHash!, 'una-nueva-buena')).resolves.toBe(true);
      await request(server()).post('/api/auth/login').send({ email: EMAIL, password: 'una-nueva-buena' }).expect(200);

      const others = await testSetup.prisma.dbAuthSession.findMany({ where: { familyId: 'otra-sesion' } });

      expect(others.every((session) => session.revokedAt !== null)).toBe(true);
      expect(testSetup.mailbox.lastOf('passwordChanged')?.to).toBe(EMAIL);
    });

    it('should ask for the current password before changing one that exists', async () => {
      await seedAccount({ passwordHash: await hashPassword(PASSWORD) });

      await request(server()).put('/api/account/password').send({ password: 'una-nueva-buena' }).expect(400);
      await request(server())
        .put('/api/account/password')
        .send({ password: 'una-nueva-buena', currentPassword: 'la-equivocada' })
        .expect(401);
      await request(server())
        .put('/api/account/password')
        .send({ password: 'una-nueva-buena', currentPassword: PASSWORD })
        .expect(204);
    });
  });

  describe('DELETE /account/identities/:provider', () => {
    it('should unlink Google when a password is left to sign in with', async () => {
      const user = await seedAccount({ passwordHash: await hashPassword(PASSWORD) });
      await linkGoogle(user.id);

      await request(server()).delete('/api/account/identities/GOOGLE').expect(204);

      expect(await testSetup.prisma.dbAuthIdentity.count({ where: { userId: user.id } })).toBe(0);
    });

    it('should refuse to leave somebody with no way back in', async () => {
      const user = await seedAccount();
      await linkGoogle(user.id);

      await request(server()).delete('/api/account/identities/GOOGLE').expect(400);

      expect(await testSetup.prisma.dbAuthIdentity.count({ where: { userId: user.id } })).toBe(1);
    });

    it('should refuse to unlink something that was never linked', async () => {
      await seedAccount({ passwordHash: await hashPassword(PASSWORD) });

      await request(server()).delete('/api/account/identities/GOOGLE').expect(400);
    });

    it('should refuse a provider it has never heard of', async () => {
      await seedAccount({ passwordHash: await hashPassword(PASSWORD) });

      await request(server()).delete('/api/account/identities/FACEBOOK').expect(400);
    });
  });
});

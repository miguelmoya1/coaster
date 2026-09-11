import request from 'supertest';
import { hashAuthToken } from '../../src/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../../src/auth/domain/password';
import { E2eTestSetup } from '../utils/e2e-setup';

const EMAIL = 'invitada@coaster.test';
const PASSWORD = 'una-contrasena-buena';

describe('Invitations (e2e)', () => {
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

  const invited = async (overrides: Record<string, unknown> = {}) => {
    const user = await testSetup.prisma.dbUser.create({ data: { email: EMAIL, name: 'Invitada', ...overrides } });

    const token = 'una-invitacion-de-prueba';

    await testSetup.prisma.dbAuthToken.create({
      data: {
        userId: user.id,
        purpose: 'INVITE',
        tokenHash: hashAuthToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    return { user, token };
  };

  describe('GET /auth/invite/:token', () => {
    it('should tell the page who the invitation is for, and that they cannot sign in yet', async () => {
      const { token } = await invited();

      const response = await request(server()).get(`/api/auth/invite/${token}`).expect(200);

      expect(response.body).toEqual({ email: EMAIL, name: 'Invitada', hasCredentials: false });
    });

    it('should say when the invited person can already sign in, so the page sends them to the login', async () => {
      const { token } = await invited({ passwordHash: await hashPassword(PASSWORD) });

      const response = await request(server()).get(`/api/auth/invite/${token}`).expect(200);

      expect(response.body.hasCredentials).toBe(true);
    });

    it('should refuse an invitation nobody issued', async () => {
      await request(server()).get('/api/auth/invite/una-invencion').expect(400);
    });

    it('should refuse an invitation past its date', async () => {
      const user = await testSetup.prisma.dbUser.create({ data: { email: EMAIL, name: 'Invitada' } });

      await testSetup.prisma.dbAuthToken.create({
        data: {
          userId: user.id,
          purpose: 'INVITE',
          tokenHash: hashAuthToken('caducada'),
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await request(server()).get('/api/auth/invite/caducada').expect(400);
    });
  });

  describe('POST /auth/invite', () => {
    it('should claim the account with a password and sign the person in', async () => {
      const { user, token } = await invited();

      const response = await request(server())
        .post('/api/auth/invite')
        .send({ token, password: PASSWORD })
        .expect(200);

      expect(response.body.user.id).toBe(user.id);

      const stored = await testSetup.prisma.dbUser.findUnique({ where: { id: user.id } });

      expect(stored!.passwordHash).toMatch(/^\$argon2id\$/);
      expect(stored!.emailVerifiedAt).not.toBeNull();
    });

    it('should let the person sign in afterwards with the password they chose', async () => {
      const { token } = await invited();

      await request(server()).post('/api/auth/invite').send({ token, password: PASSWORD }).expect(200);

      await request(server()).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(200);
    });

    it('should refuse to claim the same invitation twice', async () => {
      const { token } = await invited();

      await request(server()).post('/api/auth/invite').send({ token, password: PASSWORD }).expect(200);
      await request(server()).post('/api/auth/invite').send({ token, password: 'otra-distinta' }).expect(400);
    });

    it('should refuse to overwrite the password of somebody who already had one', async () => {
      const { token } = await invited({ passwordHash: await hashPassword('la-suya-de-siempre') });

      await request(server()).post('/api/auth/invite').send({ token, password: PASSWORD }).expect(400);
    });

    it('should refuse a password shorter than eight characters', async () => {
      const { token } = await invited();

      await request(server()).post('/api/auth/invite').send({ token, password: 'corta' }).expect(400);
    });
  });
});

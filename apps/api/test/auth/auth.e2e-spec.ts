import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashRefreshToken, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from '../../src/auth';
import { hashPassword } from '../../src/auth/domain/password';
import { E2eTestSetup } from '../utils/e2e-setup';

const CREDENTIALS = { email: 'nueva@coaster.test', password: 'a-good-enough-password', name: 'Nueva' };

const cookieFrom = (response: request.Response): string => {
  const jar = response.headers['set-cookie'] as unknown as string[];

  return jar.find((entry) => entry.startsWith(`${REFRESH_COOKIE_NAME}=`))!;
};

const valueOf = (cookie: string): string => cookie.split(';')[0].split('=')[1];

describe('AuthController (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const server = () => testSetup.app.getHttpServer();

  const register = (body: Record<string, unknown> = CREDENTIALS) =>
    request(server()).post('/api/auth/register').send(body);

  const seedAccount = async () =>
    testSetup.prisma.dbUser.create({
      data: {
        email: CREDENTIALS.email,
        name: CREDENTIALS.name,
        passwordHash: await hashPassword(CREDENTIALS.password),
        passwordUpdatedAt: new Date(),
      },
    });

  const seedSession = async (userId: string, token = 'a-seeded-refresh-token') => {
    await testSetup.prisma.dbAuthSession.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(token),
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    return `${REFRESH_COOKIE_NAME}=${token}`;
  };

  describe('POST /auth/register', () => {
    it('should open an account and hand back an access token', async () => {
      const response = await register().expect(201);

      expect(response.body.user).toMatchObject({ email: CREDENTIALS.email, name: CREDENTIALS.name });
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.expiresIn).toBe(15 * 60);
    });

    it('should store the password hashed and never send it back', async () => {
      const response = await register().expect(201);
      const stored = await testSetup.prisma.dbUser.findUnique({ where: { email: CREDENTIALS.email } });

      expect(stored!.passwordHash).toMatch(/^\$argon2id\$/);
      expect(JSON.stringify(response.body)).not.toContain(CREDENTIALS.password);
      expect(JSON.stringify(response.body)).not.toContain('argon2');
    });

    it('should put the session in a cookie the browser cannot read, and keep it out of the body', async () => {
      const response = await register().expect(201);
      const cookie = cookieFrom(response);

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain(`Path=${REFRESH_COOKIE_PATH}`);
      expect(JSON.stringify(response.body)).not.toContain(valueOf(cookie));
    });

    it('should refuse a second account on the same address', async () => {
      await seedAccount();

      await register().expect(409);
    });

    it('should refuse a password shorter than eight characters', async () => {
      await register({ ...CREDENTIALS, password: 'short' }).expect(400);
    });

    it('should refuse something that is not an email address', async () => {
      await register({ ...CREDENTIALS, email: 'not-an-address' }).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const login = (body: Record<string, unknown>) => request(server()).post('/api/auth/login').send(body);

    beforeEach(async () => {
      await seedAccount();
    });

    it('should sign in with the right password', async () => {
      const response = await login({ email: CREDENTIALS.email, password: CREDENTIALS.password }).expect(200);

      expect(response.body.user.email).toBe(CREDENTIALS.email);
      expect(cookieFrom(response)).toContain('HttpOnly');
    });

    it('should sign in whatever the casing of the address', async () => {
      await login({ email: 'Nueva@Coaster.TEST', password: CREDENTIALS.password }).expect(200);
    });

    it('should answer the same way to a wrong password and to an unknown address', async () => {
      const wrongPassword = await login({ email: CREDENTIALS.email, password: 'not-the-password' }).expect(401);
      const unknownAddress = await login({ email: 'nobody@coaster.test', password: CREDENTIALS.password }).expect(401);

      expect(wrongPassword.body.message).toBe(unknownAddress.body.message);
    });

    it('should refuse a deactivated account', async () => {
      await testSetup.prisma.dbUser.update({ where: { email: CREDENTIALS.email }, data: { active: false } });

      await login({ email: CREDENTIALS.email, password: CREDENTIALS.password }).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    const refresh = (cookie?: string) => {
      const call = request(server()).post('/api/auth/refresh');

      return cookie ? call.set('Cookie', cookie) : call;
    };

    it('should trade the cookie for a fresh access token', async () => {
      const user = await seedAccount();
      const response = await refresh(await seedSession(user.id)).expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(CREDENTIALS.email);
    });

    it('should hand back a different cookie every time, so a stolen one ages out', async () => {
      const user = await seedAccount();
      const first = await seedSession(user.id);
      const second = cookieFrom(await refresh(first).expect(200));

      expect(valueOf(second)).not.toBe(valueOf(first));
    });

    it('should keep the session alive across a chain of refreshes', async () => {
      const user = await seedAccount();
      let cookie = await seedSession(user.id);

      for (let turn = 0; turn < 4; turn++) {
        cookie = cookieFrom(await refresh(cookie).expect(200));
      }
    });

    it('should refuse a request with no cookie at all', async () => {
      await refresh().expect(401);
    });

    it('should refuse a cookie nobody issued', async () => {
      await refresh(`${REFRESH_COOKIE_NAME}=a-token-out-of-thin-air`).expect(401);
    });

    it('should refuse a session that has already expired', async () => {
      const user = await seedAccount();
      await testSetup.prisma.dbAuthSession.create({
        data: {
          userId: user.id,
          tokenHash: hashRefreshToken('a-stale-token'),
          familyId: 'family-1',
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      await refresh(`${REFRESH_COOKIE_NAME}=a-stale-token`).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should end the session and clear the cookie', async () => {
      const user = await seedAccount();
      const cookie = await seedSession(user.id);

      const response = await request(server()).post('/api/auth/logout').set('Cookie', cookie).expect(204);

      expect(cookieFrom(response)).toContain(`${REFRESH_COOKIE_NAME}=;`);

      await request(server()).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('should not complain when there was no session to end', async () => {
      await request(server()).post('/api/auth/logout').expect(204);
    });
  });
});

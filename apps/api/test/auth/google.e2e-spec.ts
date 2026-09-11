import { createSign, generateKeyPairSync } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { REFRESH_COOKIE_NAME } from '../../src/auth';
import { hashPassword } from '../../src/auth/domain/password';
import { E2eTestSetup } from '../utils/e2e-setup';

const CLIENT_ID = 'e2e-client.apps.googleusercontent.com';
const SUBJECT = '110000000000000000001';
const EMAIL = 'alguien@coaster.test';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const googleToken = (overrides: Record<string, unknown> = {}) => {
  const header = base64url({ alg: 'RS256', typ: 'JWT', kid: 'e2e-key' });
  const claims = base64url({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: SUBJECT,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: EMAIL,
    email_verified: true,
    name: 'Alguien',
    picture: 'https://lh3.googleusercontent.com/a/photo',
    ...overrides,
  });

  return `${header}.${claims}.${createSign('RSA-SHA256').update(`${header}.${claims}`).sign(privateKey).toString('base64url')}`;
};

describe('AuthController Google sign-in (e2e)', () => {
  const testSetup = new E2eTestSetup();

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'e2e-key' }] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  const signIn = (credential = googleToken()) => request(testSetup.app.getHttpServer()).post('/api/auth/google').send({ credential });

  it('should open an account, already verified, for somebody Google has never sent before', async () => {
    const response = await signIn().expect(200);

    expect(response.body.user).toMatchObject({ email: EMAIL, name: 'Alguien' });
    expect(response.body.accessToken).toEqual(expect.any(String));

    const stored = await testSetup.prisma.dbUser.findUnique({
      where: { email: EMAIL },
      include: { identities: true },
    });

    expect(stored!.emailVerifiedAt).not.toBeNull();
    expect(stored!.passwordHash).toBeNull();
    expect(stored!.identities).toHaveLength(1);
    expect(stored!.identities[0]).toMatchObject({ provider: 'GOOGLE', subject: SUBJECT });

    const jar = response.headers['set-cookie'] as unknown as string[];

    expect(jar.find((entry) => entry.startsWith(`${REFRESH_COOKIE_NAME}=`))).toContain('HttpOnly');
  });

  it('should land on the same record the second time, without a second identity', async () => {
    const first = await signIn().expect(200);
    const second = await signIn().expect(200);

    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await testSetup.prisma.dbAuthIdentity.count()).toBe(1);
  });

  it('should claim the record of somebody who was invited but never got in', async () => {
    const invited = await testSetup.prisma.dbUser.create({ data: { email: EMAIL, name: 'Alguien' } });

    const response = await signIn().expect(200);

    expect(response.body.user.id).toBe(invited.id);
    expect(await testSetup.prisma.dbUser.count()).toBe(1);
  });

  it('should keep the password of an address whose owner had already been verified', async () => {
    await testSetup.prisma.dbUser.create({
      data: {
        email: EMAIL,
        name: 'Alguien',
        passwordHash: await hashPassword('a-good-enough-password'),
        emailVerifiedAt: new Date(),
      },
    });

    await signIn().expect(200);

    const stored = await testSetup.prisma.dbUser.findUnique({ where: { email: EMAIL } });

    expect(stored!.passwordHash).not.toBeNull();
  });

  it('should drop a password nobody ever proved, so a squatter cannot keep the account', async () => {
    await testSetup.prisma.dbUser.create({
      data: { email: EMAIL, name: 'Alguien', passwordHash: await hashPassword('a-good-enough-password') },
    });

    await signIn().expect(200);

    const stored = await testSetup.prisma.dbUser.findUnique({ where: { email: EMAIL } });

    expect(stored!.passwordHash).toBeNull();
    expect(stored!.emailVerifiedAt).not.toBeNull();

    await request(testSetup.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'a-good-enough-password' })
      .expect(401);
  });

  it('should follow the same person to a new Google account on the same verified address', async () => {
    const user = await testSetup.prisma.dbUser.create({
      data: {
        email: EMAIL,
        name: 'Alguien',
        emailVerifiedAt: new Date(),
        identities: {
          create: { provider: 'GOOGLE', subject: 'un-sub-anterior', email: EMAIL },
        },
      },
    });

    const response = await signIn().expect(200);

    expect(response.body.user.id).toBe(user.id);

    const identities = await testSetup.prisma.dbAuthIdentity.findMany({ where: { userId: user.id } });

    expect(identities).toHaveLength(1);
    expect(identities[0].subject).toBe(SUBJECT);
  });

  it('should refuse a token minted for another client', async () => {
    await signIn(googleToken({ aud: 'somebody-else.apps.googleusercontent.com' })).expect(401);
  });

  it('should refuse a deactivated account', async () => {
    await testSetup.prisma.dbUser.create({ data: { email: EMAIL, name: 'Alguien', active: false } });

    await signIn().expect(401);
  });

});

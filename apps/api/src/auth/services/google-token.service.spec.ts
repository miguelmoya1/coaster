import { generateKeyPairSync, createSign, KeyObject } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleTokenService } from './google-token.service';

const CLIENT_ID = '1234567890-abcdefg.apps.googleusercontent.com';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const signWith = (key: KeyObject, header: Record<string, unknown>, claims: Record<string, unknown>) => {
  const signingInput = `${base64url(header)}.${base64url(claims)}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key).toString('base64url');

  return `${signingInput}.${signature}`;
};

const validClaims = (overrides: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: '110000000000000000001',
  exp: Math.floor(Date.now() / 1000) + 3600,
  email: 'Someone@Coaster.test',
  email_verified: true,
  name: 'Someone',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  ...overrides,
});

const token = (overrides: Record<string, unknown> = {}, key = privateKey, kid = 'the-key') =>
  signWith(key, { alg: 'RS256', typ: 'JWT', kid }, validClaims(overrides));

describe('GoogleTokenService', () => {
  let service: GoogleTokenService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'the-key' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    service = new GoogleTokenService({ get: () => CLIENT_ID } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should say it is not configured without a client id', () => {
    expect(new GoogleTokenService({ get: () => undefined } as never).configured).toBe(false);
    expect(service.configured).toBe(true);
  });

  it('should accept a token Google signed for us', async () => {
    await expect(service.verify(token())).resolves.toEqual({
      subject: '110000000000000000001',
      email: 'someone@coaster.test',
      name: 'Someone',
      picture: 'https://lh3.googleusercontent.com/a/photo',
    });
  });

  it('should refuse a token signed by somebody else', async () => {
    await expect(service.verify(token({}, other.privateKey))).resolves.toBeNull();
  });

  it('should refuse a token minted for a different client', async () => {
    await expect(service.verify(token({ aud: 'another-client.apps.googleusercontent.com' }))).resolves.toBeNull();
  });

  it('should refuse a token from another issuer', async () => {
    await expect(service.verify(token({ iss: 'https://accounts.evil.example' }))).resolves.toBeNull();
  });

  it('should refuse an expired token', async () => {
    await expect(service.verify(token({ exp: Math.floor(Date.now() / 1000) - 1 }))).resolves.toBeNull();
  });

  it('should refuse an address Google does not vouch for', async () => {
    await expect(service.verify(token({ email_verified: false }))).resolves.toBeNull();
  });

  it('should refuse a token with no address at all', async () => {
    await expect(service.verify(token({ email: undefined }))).resolves.toBeNull();
  });

  it('should refuse a token that names an algorithm we do not accept', async () => {
    const forged = `${base64url({ alg: 'none', typ: 'JWT', kid: 'the-key' })}.${base64url(validClaims())}.`;

    await expect(service.verify(forged)).resolves.toBeNull();
  });

  it('should refuse a token signed with a key Google does not publish', async () => {
    await expect(service.verify(token({}, privateKey, 'a-key-nobody-published'))).resolves.toBeNull();
  });

  it('should refuse anything that is not a token', async () => {
    await expect(service.verify(undefined)).resolves.toBeNull();
    await expect(service.verify('')).resolves.toBeNull();
    await expect(service.verify('not.a.token')).resolves.toBeNull();
  });

  it('should read the signing keys once and then work from memory', async () => {
    await service.verify(token());
    await service.verify(token());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should not hammer Google when tokens keep naming keys it does not publish', async () => {
    await service.verify(token({}, privateKey, 'unknown-1'));
    await service.verify(token({}, privateKey, 'unknown-2'));
    await service.verify(token({}, privateKey, 'unknown-3'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should answer null rather than throw when Google cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('network is down'));

    await expect(service.verify(token())).resolves.toBeNull();
  });

  it('should answer null rather than throw when Google answers with something that is not a key set', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: async () => ({}),
    });

    await expect(service.verify(token())).resolves.toBeNull();
  });

  it('should verify nothing while no client id is configured', async () => {
    const unconfigured = new GoogleTokenService({ get: () => undefined } as never);

    await expect(unconfigured.verify(token())).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

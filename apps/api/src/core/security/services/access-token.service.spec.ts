import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_TOKEN_TTL_SECONDS, AccessTokenService, stripBearer } from './access-token.service';

const config = { get: () => 'a-secret-nobody-else-has' } as any;

const userRow = { id: 'user-1', active: true, preferences: null };

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('AccessTokenService', () => {
  let db: any;
  let cache: any;
  let service: AccessTokenService;

  beforeEach(() => {
    db = { dbUser: { findUnique: vi.fn().mockResolvedValue(userRow) } };
    cache = { remember: vi.fn((_key: string, load: () => Promise<unknown>) => load()) };
    service = new AccessTokenService(db, cache, config);
  });

  it('should refuse to start without a secret', () => {
    expect(() => new AccessTokenService(db, cache, { get: () => undefined } as any)).toThrow(/AUTH_JWT_SECRET/);
  });

  it('should read back the token it signed', async () => {
    const claims = await service.verify(await service.sign('user-1', 'session-1'));

    expect(claims).toMatchObject({ sub: 'user-1', sid: 'session-1' });
    expect(claims!.exp - claims!.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });

  it('should read a token that arrives with the Bearer prefix', async () => {
    const token = await service.sign('user-1', 'session-1');

    await expect(service.verify(`Bearer ${token}`)).resolves.toMatchObject({ sub: 'user-1' });
  });

  it('should reject a payload edited after signing', async () => {
    const [header, , signature] = (await service.sign('user-1', 'session-1')).split('.');
    const forged = base64url({ sub: 'someone-else', sid: 's', iat: 0, exp: 9999999999 });

    await expect(service.verify(`${header}.${forged}.${signature}`)).resolves.toBeNull();
  });

  it('should reject a token signed with another secret', async () => {
    const other = new AccessTokenService(db, cache, { get: () => 'a-different-secret' } as any);

    await expect(service.verify(await other.sign('user-1', 'session-1'))).resolves.toBeNull();
  });

  it('should reject a token that claims no algorithm at all', async () => {
    const header = base64url({ alg: 'none', typ: 'JWT' });
    const payload = base64url({ sub: 'user-1', sid: 's', iat: 0, exp: 9999999999 });

    await expect(service.verify(`${header}.${payload}.`)).resolves.toBeNull();
  });

  it('should reject a token minted for something other than this API', async () => {
    const { SignJWT } = await import('jose');
    const foreign = await new SignJWT({ sid: 'session-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('somebody-else')
      .setAudience('coaster-api')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('a-secret-nobody-else-has'));

    await expect(service.verify(foreign)).resolves.toBeNull();
  });

  it('should reject a token past its expiry', async () => {
    vi.useFakeTimers();

    try {
      const token = await service.sign('user-1', 'session-1');

      vi.advanceTimersByTime((ACCESS_TOKEN_TTL_SECONDS + 60) * 1000);

      await expect(service.verify(token)).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should reject anything that is not a token', async () => {
    await expect(service.verify(undefined)).resolves.toBeNull();
    await expect(service.verify('')).resolves.toBeNull();
    await expect(service.verify('Bearer ')).resolves.toBeNull();
    await expect(service.verify('not.a.token')).resolves.toBeNull();
  });

  it('should load the caller behind the cache, by our own user id', async () => {
    const caller = await service.resolve(await service.sign('user-1', 'session-1'));

    expect(cache.remember).toHaveBeenCalledWith('user:user-1', expect.any(Function));
    expect(db.dbUser.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      include: { preferences: true },
      omit: { passwordHash: true },
    });
    expect(caller?.user).toBe(userRow);
  });

  it('should never ask for the password hash, because this row ends up in Redis', async () => {
    await service.resolve(await service.sign('user-1', 'session-1'));

    expect(db.dbUser.findUnique).toHaveBeenCalledWith(expect.objectContaining({ omit: { passwordHash: true } }));
  });

  it('should not go near the database when the token does not verify', async () => {
    expect(await service.resolve('not.a.token')).toBeNull();
    expect(db.dbUser.findUnique).not.toHaveBeenCalled();
  });

  it('should strip the Bearer prefix in any casing', () => {
    expect(stripBearer('bearer abc')).toBe('abc');
    expect(stripBearer('Bearer abc')).toBe('abc');
    expect(stripBearer('abc')).toBe('abc');
    expect(stripBearer(null)).toBeNull();
  });
});

import { ForbiddenException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginWithGoogleCommand } from '../impl/login-with-google.command';
import { LoginWithGoogleHandler } from './login-with-google.handler';

const ORIGIN = { userAgent: 'a-browser', ip: '10.0.0.1' };

const GOOGLE = {
  subject: '110000000000000000001',
  email: 'someone@coaster.test',
  name: 'Someone',
  picture: 'https://lh3.googleusercontent.com/a/photo',
};

const account = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'someone@coaster.test',
  active: true,
  photoUrl: null,
  emailVerifiedAt: new Date('2026-01-01'),
  passwordHash: null,
  preferences: null,
  ...overrides,
});

describe('LoginWithGoogleHandler', () => {
  let db: any;
  let google: any;
  let identities: any;
  let sessions: any;
  let users: any;
  let session: any;
  let config: any;
  let handler: LoginWithGoogleHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
    vi.spyOn(Logger.prototype, 'error').mockReturnValue(undefined);

    db = {
      dbUser: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(account({ id: 'user-new' })),
        update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(account(data))),
      },
      dbBetaTester: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    google = { configured: true, verify: vi.fn().mockResolvedValue(GOOGLE) };
    identities = { findUserBySubject: vi.fn().mockResolvedValue(null), touch: vi.fn(), link: vi.fn() };
    sessions = { revokeEverySessionOf: vi.fn() };
    users = {
      update: vi.fn().mockImplementation((_id: string, data: any) => Promise.resolve(account(data))),
    };
    session = { issue: vi.fn().mockResolvedValue({ accessToken: 'fresh' }) };
    config = { get: vi.fn().mockReturnValue('false') };

    handler = new LoginWithGoogleHandler(db, google, identities, sessions, users, session, config);
  });

  const signIn = () => handler.execute(new LoginWithGoogleCommand('a-google-credential', ORIGIN));

  describe('an identity we already know', () => {
    it('should sign the linked user in', async () => {
      const linked = account();
      identities.findUserBySubject.mockResolvedValue(linked);

      await expect(signIn()).resolves.toEqual({ accessToken: 'fresh' });

      expect(session.issue).toHaveBeenCalledWith(linked, ORIGIN);
      expect(identities.touch).toHaveBeenCalledWith('GOOGLE', GOOGLE.subject);
      expect(db.dbUser.findUnique).not.toHaveBeenCalled();
    });

    it('should refuse a deactivated account', async () => {
      identities.findUserBySubject.mockResolvedValue(account({ active: false }));

      await expect(signIn()).rejects.toThrow(UnauthorizedException);
      expect(session.issue).not.toHaveBeenCalled();
    });
  });

  describe('an address that already has an account', () => {
    it('should link the identity and sign in, which is how a Firebase user lands on their old record', async () => {
      db.dbUser.findUnique.mockResolvedValue(account());

      await expect(signIn()).resolves.toEqual({ accessToken: 'fresh' });

      expect(identities.link).toHaveBeenCalledWith('user-1', 'GOOGLE', GOOGLE.subject, GOOGLE.email);
    });

    it('should keep the password of an address somebody had already proved', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ passwordHash: '$argon2id$...' }));

      await signIn();

      expect(users.update.mock.calls[0][1]).not.toHaveProperty('passwordHash');
      expect(sessions.revokeEverySessionOf).not.toHaveBeenCalled();
    });

    it('should drop a password nobody ever proved, and the sessions it opened', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ emailVerifiedAt: null, passwordHash: '$argon2id$...' }));

      await signIn();

      expect(users.update.mock.calls[0][1]).toMatchObject({ passwordHash: null, passwordUpdatedAt: null });
      expect(sessions.revokeEverySessionOf).toHaveBeenCalledWith('user-1');
    });

    it('should write through the repository that clears the cache, not straight to the table', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ emailVerifiedAt: null }));

      await signIn();

      expect(users.update).toHaveBeenCalled();
      expect(db.dbUser.update).not.toHaveBeenCalled();
    });

    it('should mark the address verified once Google has vouched for it', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ emailVerifiedAt: null }));

      await signIn();

      expect(users.update.mock.calls[0][1].emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('should take the photo from Google only when the record has none', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ photoUrl: 'https://coaster.test/mine.png' }));

      await signIn();

      expect(users.update.mock.calls[0][1]).not.toHaveProperty('photoUrl');
    });

    it('should refuse a deactivated account', async () => {
      db.dbUser.findUnique.mockResolvedValue(account({ active: false }));

      await expect(signIn()).rejects.toThrow(UnauthorizedException);
      expect(identities.link).not.toHaveBeenCalled();
    });
  });

  describe('an address nobody has used', () => {
    it('should open an account already verified, with the identity attached', async () => {
      await expect(signIn()).resolves.toEqual({ accessToken: 'fresh' });

      const { data } = db.dbUser.create.mock.calls[0][0];

      expect(data).toMatchObject({ email: GOOGLE.email, name: 'Someone', photoUrl: GOOGLE.picture });
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(data.identities.create).toMatchObject({ provider: 'GOOGLE', subject: GOOGLE.subject });
    });

    it('should fall back to the local part when Google sends no name', async () => {
      google.verify.mockResolvedValue({ ...GOOGLE, name: null });

      await signIn();

      expect(db.dbUser.create.mock.calls[0][0].data.name).toBe('someone');
    });

    it('should refuse anyone off the allowlist while the beta is closed', async () => {
      config.get.mockReturnValue('true');

      await expect(signIn()).rejects.toThrow(ForbiddenException);
      expect(db.dbUser.create).not.toHaveBeenCalled();
    });

    it('should let an invited tester through while the beta is closed', async () => {
      config.get.mockReturnValue('true');
      db.dbBetaTester.findUnique.mockResolvedValue({ email: GOOGLE.email });

      await expect(signIn()).resolves.toEqual({ accessToken: 'fresh' });
    });
  });

  it('should refuse a credential Google does not vouch for', async () => {
    google.verify.mockResolvedValue(null);

    await expect(signIn()).rejects.toThrow(UnauthorizedException);
    expect(db.dbUser.create).not.toHaveBeenCalled();
  });

  it('should say so plainly when no client id is configured, rather than blaming the user', async () => {
    google.configured = false;

    await expect(signIn()).rejects.toThrow(ServiceUnavailableException);
    expect(google.verify).not.toHaveBeenCalled();
  });
});

import { FirebaseTokenService, type SecurityRepository } from '@coaster/core';
import { DbRole, type DbService } from '@coaster/core/db';
import { Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WsAuthService } from './ws-auth.service';

const verifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: (token: string) => verifyIdToken(token) }),
}));

describe('WsAuthService', () => {
  let service: WsAuthService;
  let dbMock: any;
  let securityRepoMock: any;

  const createSocket = (handshake: Record<string, unknown>) => ({ id: 'socket-1', handshake }) as unknown as Socket;

  beforeEach(() => {
    vi.clearAllMocks();

    dbMock = { dbUser: { findUnique: vi.fn() } };
    securityRepoMock = { getUserRole: vi.fn(), getEstablishmentMemberRole: vi.fn() };

    service = new WsAuthService(
      new FirebaseTokenService(dbMock as unknown as DbService),
      securityRepoMock as unknown as SecurityRepository,
    );

    vi.spyOn(Logger.prototype, 'warn').mockReturnValue(undefined);
  });

  describe('extractToken', () => {
    it('should read the token from handshake auth', () => {
      const socket = createSocket({ auth: { token: 'tok_123' } });

      expect(service.extractToken(socket)).toBe('tok_123');
    });

    it('should strip a Bearer prefix from the handshake auth token', () => {
      const socket = createSocket({ auth: { token: 'Bearer tok_123' } });

      expect(service.extractToken(socket)).toBe('tok_123');
    });

    it('should fall back to the Authorization header', () => {
      const socket = createSocket({ auth: {}, headers: { authorization: 'Bearer tok_456' } });

      expect(service.extractToken(socket)).toBe('tok_456');
    });

    it('should return null when no token is present', () => {
      expect(service.extractToken(createSocket({ auth: {}, headers: {} }))).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should resolve the local user id for a valid token', async () => {
      verifyIdToken.mockResolvedValue({ sub: 'google-1' });
      dbMock.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: true });

      const userId = await service.authenticate(createSocket({ auth: { token: 'tok_123' } }));

      expect(verifyIdToken).toHaveBeenCalledWith('tok_123');
      expect(dbMock.dbUser.findUnique).toHaveBeenCalledWith({
        where: { googleId: 'google-1' },
      });
      expect(userId).toBe('user-1');
    });

    it('should reject a connection with no token without hitting Firebase', async () => {
      const userId = await service.authenticate(createSocket({ auth: {}, headers: {} }));

      expect(userId).toBeNull();
      expect(verifyIdToken).not.toHaveBeenCalled();
    });

    it('should reject an invalid token', async () => {
      verifyIdToken.mockRejectedValue(new Error('token expired'));

      const userId = await service.authenticate(createSocket({ auth: { token: 'bad' } }));

      expect(userId).toBeNull();
      expect(dbMock.dbUser.findUnique).not.toHaveBeenCalled();
    });

    it('should reject a token whose user does not exist locally', async () => {
      verifyIdToken.mockResolvedValue({ sub: 'google-unknown' });
      dbMock.dbUser.findUnique.mockResolvedValue(null);

      await expect(service.authenticate(createSocket({ auth: { token: 'tok' } }))).resolves.toBeNull();
    });

    it('should reject a decoded token without a subject', async () => {
      verifyIdToken.mockResolvedValue({});

      await expect(service.authenticate(createSocket({ auth: { token: 'tok' } }))).resolves.toBeNull();
    });

    it('should reject a user an admin has deactivated', async () => {
      verifyIdToken.mockResolvedValue({ sub: 'google-1' });
      dbMock.dbUser.findUnique.mockResolvedValue({ id: 'user-1', active: false });

      await expect(service.authenticate(createSocket({ auth: { token: 'tok' } }))).resolves.toBeNull();
    });
  });

  describe('canAccessEstablishment', () => {
    it('should allow platform admins into any establishment', async () => {
      securityRepoMock.getUserRole.mockResolvedValue(DbRole.ADMIN);

      await expect(service.canAccessEstablishment('user-1', 'establishment-1')).resolves.toBe(true);
      expect(securityRepoMock.getEstablishmentMemberRole).not.toHaveBeenCalled();
    });

    it('should allow an active member of the establishment', async () => {
      securityRepoMock.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepoMock.getEstablishmentMemberRole.mockResolvedValue({ role: 'STAFF', active: true });

      await expect(service.canAccessEstablishment('user-1', 'establishment-1')).resolves.toBe(true);
    });

    it('should reject a user who is not a member of the establishment', async () => {
      securityRepoMock.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepoMock.getEstablishmentMemberRole.mockResolvedValue(null);

      await expect(service.canAccessEstablishment('user-1', 'someone-elses-establishment')).resolves.toBe(false);
    });

    it('should reject a deactivated member', async () => {
      securityRepoMock.getUserRole.mockResolvedValue(DbRole.USER);
      securityRepoMock.getEstablishmentMemberRole.mockResolvedValue({ role: 'STAFF', active: false });

      await expect(service.canAccessEstablishment('user-1', 'establishment-1')).resolves.toBe(false);
    });
  });
});

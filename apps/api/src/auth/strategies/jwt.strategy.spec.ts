import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getAuth } from 'firebase-admin/auth';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbService } from '../../core/db';
import { JwtStrategy } from './jwt.strategy';

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn().mockReturnValue({
    verifyIdToken: vi.fn(),
  }),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let db: { dbUser: { findUnique: Mock; update: Mock; create: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      dbUser: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    db = module.get(DbService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate the token and find/update the user', async () => {
    const fakePayload = {
      sub: 'google-123',
      email: 'test@mail.com',
      name: 'Test User',
      picture: 'http://photo.url',
    };
    (getAuth().verifyIdToken as Mock).mockResolvedValue(fakePayload);
    db.dbUser.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });
    db.dbUser.update.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    const result = await strategy.validate('fake-token');

    expect(getAuth().verifyIdToken).toHaveBeenCalledWith('fake-token');
    expect(db.dbUser.findUnique).toHaveBeenCalledWith({ where: { googleId: 'google-123' } });
    expect(db.dbUser.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { photoUrl: 'http://photo.url' },
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });
  });

  it('should validate the token and create the user if not found', async () => {
    const fakePayload = {
      sub: 'google-123',
      email: 'test@mail.com',
      name: 'Test User',
      picture: 'http://photo.url',
    };
    (getAuth().verifyIdToken as Mock).mockResolvedValue(fakePayload);
    db.dbUser.findUnique.mockResolvedValue(null);
    db.dbUser.create.mockResolvedValue({
      id: 'user-2',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    const result = await strategy.validate('fake-token');

    expect(getAuth().verifyIdToken).toHaveBeenCalledWith('fake-token');
    expect(db.dbUser.findUnique).toHaveBeenCalledWith({ where: { googleId: 'google-123' } });
    expect(db.dbUser.findUnique).toHaveBeenCalledWith({ where: { email: 'test@mail.com' } });
    expect(db.dbUser.create).toHaveBeenCalledWith({
      data: { email: 'test@mail.com', googleId: 'google-123', name: 'Test User', photoUrl: 'http://photo.url' },
    });
    expect(result).toEqual({
      id: 'user-2',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });
  });

  it('should throw UnauthorizedException if the payload has no sub', async () => {
    (getAuth().verifyIdToken as Mock).mockResolvedValue({ email: 'test@mail.com' });

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if verifyIdToken fails', async () => {
    (getAuth().verifyIdToken as Mock).mockRejectedValue(new Error('bad'));

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });
});

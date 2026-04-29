import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PrismaService } from '../../prisma/services/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import * as admin from 'firebase-admin';

vi.mock('firebase-admin', () => ({
  auth: vi.fn().mockReturnValue({
    verifyIdToken: vi.fn(),
  }),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { upsert: Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      user: { upsert: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate the token and upsert the user', async () => {
    const fakePayload = {
      sub: 'google-123',
      email: 'test@mail.com',
      name: 'Test User',
      picture: 'http://photo.url',
    };
    (admin.auth().verifyIdToken as Mock).mockResolvedValue(fakePayload);
    prisma.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    const result = await strategy.validate('fake-token');

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('fake-token');
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'test@mail.com' },
      update: { googleId: 'google-123', name: 'Test User', photoUrl: 'http://photo.url' },
      create: { email: 'test@mail.com', googleId: 'google-123', name: 'Test User', photoUrl: 'http://photo.url' },
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });
  });

  it('should throw UnauthorizedException if the payload has no sub', async () => {
    (admin.auth().verifyIdToken as Mock).mockResolvedValue({ email: 'test@mail.com' });

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if verifyIdToken fails', async () => {
    (admin.auth().verifyIdToken as Mock).mockRejectedValue(new Error('bad'));

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });
});

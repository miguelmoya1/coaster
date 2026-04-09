import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/services/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
}));

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { upsert: jest.Mock } };

  beforeEach(async () => {
    const mockPrisma = {
      user: { upsert: jest.fn() },
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

  it('debería validar el token y hacer upsert del usuario', async () => {
    const fakePayload = {
      sub: 'google-123',
      email: 'test@mail.com',
      name: 'Test User',
      picture: 'http://photo.url',
    };
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue(fakePayload);
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

  it('debería lanzar UnauthorizedException si el payload no tiene sub', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ email: 'test@mail.com' });

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('debería lanzar UnauthorizedException si verifyIdToken falla', async () => {
    (admin.auth().verifyIdToken as jest.Mock).mockRejectedValue(new Error('bad'));

    await expect(strategy.validate('bad-token')).rejects.toThrow(UnauthorizedException);
  });
});

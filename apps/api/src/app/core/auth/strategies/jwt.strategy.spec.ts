import { ErrorCodes } from '@coaster/logic';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let googleOAuth: { client: { verifyIdToken: jest.Mock } };
  let prisma: { user: { upsert: jest.Mock } };

  beforeEach(async () => {
    const mockGoogleOAuth = {
      client: { verifyIdToken: jest.fn() },
    };
    const mockPrisma = {
      user: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: GoogleOAuthService, useValue: mockGoogleOAuth },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    googleOAuth = module.get(GoogleOAuthService);
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
    };
    googleOAuth.client.verifyIdToken.mockResolvedValue({
      getPayload: () => fakePayload,
    });
    prisma.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    const result = await strategy.validate('fake-token');

    expect(googleOAuth.client.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'fake-token',
    });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'test@mail.com' },
      update: { googleId: 'google-123', name: 'Test User' },
      create: { email: 'test@mail.com', googleId: 'google-123', name: 'Test User' },
    });
    expect(result).toEqual({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test User',
      googleId: 'google-123',
    });
  });

  it('debería lanzar UnauthorizedException si el payload no tiene sub', async () => {
    googleOAuth.client.verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'test@mail.com' }),
    });

    await expect(strategy.validate('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debería lanzar UnauthorizedException si verifyIdToken falla', async () => {
    googleOAuth.client.verifyIdToken.mockRejectedValue(new Error('bad'));

    await expect(strategy.validate('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

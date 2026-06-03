import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: { dbUser: { findUnique: Mock; update: Mock; upsert: Mock } };

  const mockPrisma = {
    dbUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get(PrismaService);

    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should call prisma.dbUser.findUnique with the id', async () => {
      prisma.dbUser.findUnique.mockResolvedValue({ id: 'u1' });

      const result = await repository.getById('u1');

      expect(prisma.dbUser.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(result).toEqual({ id: 'u1' });
    });

    it('should return null if it does not exist', async () => {
      prisma.dbUser.findUnique.mockResolvedValue(null);

      const result = await repository.getById('no-exist');

      expect(result).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should call prisma.dbUser.findUnique with the email', async () => {
      prisma.dbUser.findUnique.mockResolvedValue({ email: 'emailPrueba@prueba.com' });

      const result = await repository.getByEmail('emailPrueba@prueba.com');

      expect(prisma.dbUser.findUnique).toHaveBeenCalledWith({ where: { email: 'emailPrueba@prueba.com' } });
      expect(result).toEqual({ email: 'emailPrueba@prueba.com' });
    });

    it('should return null if it does not exist', async () => {
      prisma.dbUser.findUnique.mockResolvedValue(null);

      const result = await repository.getByEmail('emailPrueba@prueba.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should call prisma.dbUser.update with the id and data', async () => {
      prisma.dbUser.update.mockResolvedValue({ id: 'u1', name: 'Test' });

      const result = await repository.update('u1', { name: 'Test' });

      expect(prisma.dbUser.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { name: 'Test' } });
      expect(result).toEqual({ id: 'u1', name: 'Test' });
    });
  });

  describe('upsert', () => {
    it('should call prisma.dbUser.upsert with the correct fields', async () => {
      prisma.dbUser.upsert.mockResolvedValue({ id: 'uuid' });

      const result = await repository.upsert('emailPrueba@prueba.com', {
        email: 'emailPrueba@prueba.com',
        name: 'Test',
        googleId: 'googleId',
        photoUrl: 'photoUrl',
        active: true,
      });

      expect(prisma.dbUser.upsert).toHaveBeenCalledWith({
        where: { email: 'emailPrueba@prueba.com' },
        update: { name: 'Test', googleId: 'googleId', photoUrl: 'photoUrl', active: true },
        create: {
          email: 'emailPrueba@prueba.com',
          name: 'Test',
          googleId: 'googleId',
          photoUrl: 'photoUrl',
          active: true,
        },
      });
      expect(result).toEqual({ id: 'uuid' });
    });
  });
});

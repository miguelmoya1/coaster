import { asUserId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { BarRepository } from './bar.repository';

describe('BarRepository', () => {
  let repository: BarRepository;
  let prisma: {
    dbBar: { create: Mock };
    dbBarMember: { findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbBar: { create: vi.fn() },
      dbBarMember: { findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarRepository>(BarRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a bar with an OWNER member', async () => {
      prisma.dbBar.create.mockResolvedValue({ id: 'bar-1', name: 'Mi Bar' });

      const result = await repository.create(asUserId('user-1'), { name: 'Mi Bar' });

      expect(prisma.dbBar.create).toHaveBeenCalledWith({
        data: {
          name: 'Mi Bar',
          members: { create: { userId: 'user-1', role: 'OWNER' } },
        },
      });
      expect(result).toEqual({ id: 'bar-1', name: 'Mi Bar' });
    });
  });

  describe('findByUserId', () => {
    it('should return the user bars', async () => {
      prisma.dbBarMember.findMany.mockResolvedValue([
        { bar: { id: 'bar-1', name: 'Bar 1' } },
        { bar: { id: 'bar-2', name: 'Bar 2' } },
      ]);

      const result = await repository.findByUserId(asUserId('user-1'));

      expect(prisma.dbBarMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { bar: true },
      });
      expect(result).toEqual([
        { id: 'bar-1', name: 'Bar 1' },
        { id: 'bar-2', name: 'Bar 2' },
      ]);
    });
  });
});

import { asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PrismaService } from '../../core';
import { BarRepository } from './bar.repository';

describe('BarRepository', () => {
  let repository: BarRepository;
  let prisma: {
    bar: { create: Mock };
    barMember: { findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      bar: { create: vi.fn() },
      barMember: { findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarRepository>(BarRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a bar with an OWNER member', async () => {
      prisma.bar.create.mockResolvedValue({ id: 'bar-1', name: 'Mi Bar' });

      const result = await repository.create(asUserId('user-1'), { name: 'Mi Bar' });

      expect(prisma.bar.create).toHaveBeenCalledWith({
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
      prisma.barMember.findMany.mockResolvedValue([
        { bar: { id: 'bar-1', name: 'Bar 1' } },
        { bar: { id: 'bar-2', name: 'Bar 2' } },
      ]);

      const result = await repository.findByUserId(asUserId('user-1'));

      expect(prisma.barMember.findMany).toHaveBeenCalledWith({
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

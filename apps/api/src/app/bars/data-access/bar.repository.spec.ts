import { asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { BarRepository } from './bar.repository';

describe('BarRepository', () => {
  let repository: BarRepository;
  let prisma: {
    bar: { create: jest.Mock };
    barMember: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      bar: { create: jest.fn() },
      barMember: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarRepository>(BarRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('debería crear un bar con un miembro OWNER', async () => {
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
    it('debería devolver los bares del usuario', async () => {
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

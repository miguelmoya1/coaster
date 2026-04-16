import { asBarId, asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { ShiftsRepository } from './shifts.repository';

describe('ShiftsRepository', () => {
  let repository: ShiftsRepository;
  let prisma: {
    barMember: { findUnique: jest.Mock };
    shift: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      barMember: { findUnique: jest.fn() },
      shift: { create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftsRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ShiftsRepository>(ShiftsRepository);
    prisma = module.get(PrismaService);
  });

  describe('isUserMemberOfBar', () => {
    it('debería devolver true si el miembro está activo', async () => {
      prisma.barMember.findUnique.mockResolvedValue({ active: true });

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(true);
    });

    it('debería devolver false si no existe', async () => {
      prisma.barMember.findUnique.mockResolvedValue(null);

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });

    it('debería devolver false si está inactivo', async () => {
      prisma.barMember.findUnique.mockResolvedValue({ active: false });

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('debería crear un turno con include de user', async () => {
      const startTime = new Date('2026-03-20T08:00:00Z');
      const endTime = new Date('2026-03-20T16:00:00Z');
      prisma.shift.create.mockResolvedValue({ id: 'shift-1' });

      const result = await repository.create(asBarId('bar-1'), asUserId('u1'), {
        startTime,
        endTime,
        notes: 'notas',
      });

      expect(prisma.shift.create).toHaveBeenCalledWith({
        data: {
          bar: { connect: { id: 'bar-1' } },
          user: { connect: { id: 'u1' } },
          startTime,
          endTime,
          notes: 'notas',
        },
        include: { user: { select: { id: true, name: true } } },
      });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('findByBarId', () => {
    it('debería buscar turnos con filtro de fecha', async () => {
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');
      prisma.shift.findMany.mockResolvedValue([{ id: 'shift-1' }]);

      const result = await repository.findByBarId(asBarId('bar-1'), startDate, endDate);

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: {
          barId: 'bar-1',
          startTime: { gte: startDate, lte: endDate },
        },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toEqual([{ id: 'shift-1' }]);
    });

    it('debería buscar sin filtro de fecha si no se pasan', async () => {
      prisma.shift.findMany.mockResolvedValue([]);

      await repository.findByBarId(asBarId('bar-1'));

      expect(prisma.shift.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1' },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { startTime: 'asc' },
      });
    });
  });
});

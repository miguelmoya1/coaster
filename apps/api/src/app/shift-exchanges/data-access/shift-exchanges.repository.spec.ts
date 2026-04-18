import { asBarId, asShiftExchangeId, asShiftId, asUserId, ShiftExchangeStatus } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PrismaService } from '../../core';
import { ShiftExchangesRepository } from './shift-exchanges.repository';

describe('ShiftExchangesRepository', () => {
  let repository: ShiftExchangesRepository;
  let prisma: {
    shift: { findUnique: Mock };
    shiftExchange: { findUnique: Mock; create: Mock; findMany: Mock; update: Mock };
    $transaction: Mock;
  };

  beforeEach(async () => {
    const mockPrisma = {
      shift: { findUnique: vi.fn(), update: vi.fn() },
      shiftExchange: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftExchangesRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ShiftExchangesRepository>(ShiftExchangesRepository);
    prisma = module.get(PrismaService);
  });

  describe('getShiftById', () => {
    it('debería delegar a prisma.shift.findUnique', async () => {
      prisma.shift.findUnique.mockResolvedValue({ id: 'shift-1' });

      const result = await repository.getShiftById(asShiftId('shift-1'));

      expect(prisma.shift.findUnique).toHaveBeenCalledWith({ where: { id: 'shift-1' } });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('getExchangeById', () => {
    it('debería incluir el shift en la consulta', async () => {
      prisma.shiftExchange.findUnique.mockResolvedValue({ id: 'exc-1' });

      const result = await repository.getExchangeById(asShiftExchangeId('exc-1'));

      expect(prisma.shiftExchange.findUnique).toHaveBeenCalledWith({
        where: { id: 'exc-1' },
        include: { shift: true },
      });
      expect(result).toEqual({ id: 'exc-1' });
    });
  });

  describe('createExchange', () => {
    it('debería crear con estado PENDING', async () => {
      prisma.shiftExchange.create.mockResolvedValue({ id: 'exc-1' });

      const result = await repository.createExchange(asShiftId('shift-1'), asUserId('requester'), asUserId('target'));

      expect(prisma.shiftExchange.create).toHaveBeenCalledWith({
        data: {
          shift: { connect: { id: 'shift-1' } },
          requester: { connect: { id: 'requester' } },
          target: { connect: { id: 'target' } },
          status: ShiftExchangeStatus.PENDING,
        },
      });
      expect(result).toEqual({ id: 'exc-1' });
    });
  });

  describe('findPendingByBarId', () => {
    it('debería filtrar por PENDING y barId', async () => {
      prisma.shiftExchange.findMany.mockResolvedValue([{ id: 'exc-1' }]);

      const result = await repository.findPendingByBarId(asBarId('bar-1'));

      expect(prisma.shiftExchange.findMany).toHaveBeenCalledWith({
        where: {
          status: ShiftExchangeStatus.PENDING,
          shift: {
            barId: 'bar-1',
            startTime: { gte: expect.any(Date) },
          },
        },
        include: {
          shift: true,
          requester: { select: { id: true, name: true } },
        },
        orderBy: { shift: { startTime: 'asc' } },
      });
      expect(result).toEqual([{ id: 'exc-1' }]);
    });
  });

  describe('acceptExchangeAndSwapShift', () => {
    it('debería usar transacción para update exchange + shift', async () => {
      prisma.$transaction.mockResolvedValue([{ id: 'exc-1' }]);

      await repository.acceptExchangeAndSwapShift(
        asShiftExchangeId('exc-1'),
        asShiftId('shift-1'),
        asUserId('new-user'),
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});

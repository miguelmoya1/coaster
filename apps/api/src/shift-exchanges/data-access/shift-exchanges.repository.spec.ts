import { asBarId, asShiftExchangeId, asShiftId, asUserId, ShiftExchangeStatus } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
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
    it('should delegate to prisma.shift.findUnique', async () => {
      prisma.shift.findUnique.mockResolvedValue({ id: 'shift-1' });

      const result = await repository.getShiftById(asShiftId('shift-1'));

      expect(prisma.shift.findUnique).toHaveBeenCalledWith({ where: { id: 'shift-1' } });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('getExchangeById', () => {
    it('should include the shift in the query', async () => {
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
    it('should create with PENDING status', async () => {
      prisma.shiftExchange.create.mockResolvedValue({ id: 'exc-1' });

      const result = await repository.createExchange(asShiftId('shift-1'), asUserId('requester'), asUserId('target'));

      expect(prisma.shiftExchange.create).toHaveBeenCalledWith({
        data: {
          shift: { connect: { id: 'shift-1' } },
          requester: { connect: { id: 'requester' } },
          target: { connect: { id: 'target' } },
          status: ShiftExchangeStatus.PENDING,
        },
        include: {
          shift: true,
          requester: { select: { id: true, name: true } },
        },
      });
      expect(result).toEqual({ id: 'exc-1' });
    });
  });

  describe('findPendingByBarId', () => {
    it('should filter by PENDING and barId', async () => {
      prisma.shiftExchange.findMany.mockResolvedValue([{ id: 'exc-1' }]);

      const result = await repository.findPendingByBarId(asBarId('bar-1'));

      expect(prisma.shiftExchange.findMany).toHaveBeenCalledWith({
        where: {
          status: ShiftExchangeStatus.PENDING,
          shift: {
            barId: 'bar-1',
            startTime: { gte: expect.any(Date) as unknown },
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
    it('should use transaction to update exchange + shift', async () => {
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

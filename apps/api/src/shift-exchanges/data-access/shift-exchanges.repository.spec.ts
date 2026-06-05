import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { asBarId, asShiftExchangeId, asShiftId, asUserId, ShiftExchangeStatus } from '../../core';
import { DbService } from '../../db';
import { ShiftExchangesRepository } from './shift-exchanges.repository';

describe('ShiftExchangesRepository', () => {
  let repository: ShiftExchangesRepository;
  let db: {
    dbShift: { findUnique: Mock };
    dbShiftExchange: { findUnique: Mock; create: Mock; findMany: Mock; update: Mock };
    $transaction: Mock;
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbShift: { findUnique: vi.fn(), update: vi.fn() },
      dbShiftExchange: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftExchangesRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ShiftExchangesRepository>(ShiftExchangesRepository);
    db = module.get(DbService);
  });

  describe('getShiftById', () => {
    it('should delegate to db.dbShift.findUnique', async () => {
      db.dbShift.findUnique.mockResolvedValue({ id: 'shift-1' });

      const result = await repository.getShiftById(asShiftId('shift-1'));

      expect(db.dbShift.findUnique).toHaveBeenCalledWith({ where: { id: 'shift-1' } });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('getExchangeById', () => {
    it('should include the shift in the query', async () => {
      db.dbShiftExchange.findUnique.mockResolvedValue({ id: 'exc-1' });

      const result = await repository.getExchangeById(asShiftExchangeId('exc-1'));

      expect(db.dbShiftExchange.findUnique).toHaveBeenCalledWith({
        where: { id: 'exc-1' },
        include: { shift: true },
      });
      expect(result).toEqual({ id: 'exc-1' });
    });
  });

  describe('createExchange', () => {
    it('should create with PENDING status', async () => {
      db.dbShiftExchange.create.mockResolvedValue({ id: 'exc-1' });

      const result = await repository.createExchange(asShiftId('shift-1'), asUserId('requester'), asUserId('target'));

      expect(db.dbShiftExchange.create).toHaveBeenCalledWith({
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
      db.dbShiftExchange.findMany.mockResolvedValue([{ id: 'exc-1' }]);

      const result = await repository.findPendingByBarId(asBarId('bar-1'));

      expect(db.dbShiftExchange.findMany).toHaveBeenCalledWith({
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
      db.$transaction.mockResolvedValue([{ id: 'exc-1' }]);

      await repository.acceptExchangeAndSwapShift(
        asShiftExchangeId('exc-1'),
        asShiftId('shift-1'),
        asUserId('new-user'),
      );

      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});

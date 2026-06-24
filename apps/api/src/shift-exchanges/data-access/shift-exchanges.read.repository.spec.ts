import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftExchangeStatus, asBarId, asShiftExchangeId, asShiftId } from '../../core';
import { DbService } from '../../core/db';
import { ShiftExchangesReadRepository } from './shift-exchanges.read.repository';

describe('ShiftExchangesReadRepository', () => {
  let repository: ShiftExchangesReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftExchangesReadRepository,
        {
          provide: DbService,
          useValue: {
            dbShift: {
              findUnique: vi.fn(),
            },
            dbShiftExchange: {
              findUnique: vi.fn(),
              count: vi.fn(),
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ShiftExchangesReadRepository>(ShiftExchangesReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getShiftById', () => {
    it('should call dbShift.findUnique', async () => {
      const shiftId = asShiftId('shift-1');
      await repository.getShiftById(shiftId);
      expect(dbService.dbShift.findUnique).toHaveBeenCalledWith({ where: { id: shiftId } });
    });
  });

  describe('getExchangeById', () => {
    it('should call dbShiftExchange.findUnique', async () => {
      const exchangeId = asShiftExchangeId('exc-1');
      await repository.getExchangeById(exchangeId);
      expect(dbService.dbShiftExchange.findUnique).toHaveBeenCalledWith({
        where: { id: exchangeId },
        include: { shift: true },
      });
    });
  });

  describe('hasPendingExchangeForShift', () => {
    it('should call dbShiftExchange.count and return true if > 0', async () => {
      const shiftId = asShiftId('shift-1');
      vi.mocked(dbService.dbShiftExchange.count).mockResolvedValue(1);
      const res = await repository.hasPendingExchangeForShift(shiftId);
      expect(dbService.dbShiftExchange.count).toHaveBeenCalledWith({
        where: { shiftId, status: ShiftExchangeStatus.PENDING },
      });
      expect(res).toBe(true);
    });
  });

  describe('findPendingByBarId', () => {
    it('should call dbShiftExchange.findMany with current date constraints', async () => {
      const barId = asBarId('bar-1');
      await repository.findPendingByBarId(barId);
      expect(dbService.dbShiftExchange.findMany).toHaveBeenCalledWith({
        where: {
          status: ShiftExchangeStatus.PENDING,
          shift: {
            barId,
            startTime: { gte: expect.any(Date) },
          },
        },
        include: {
          shift: true,
          requester: { select: { id: true, name: true } },
        },
        orderBy: { shift: { startTime: 'asc' } },
      });
    });
  });
});

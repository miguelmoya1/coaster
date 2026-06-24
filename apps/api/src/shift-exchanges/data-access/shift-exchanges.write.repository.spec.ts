import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftExchangeStatus, asShiftExchangeId, asShiftId, asUserId } from '../../core';
import { DbService } from '../../core/db';
import { ShiftExchangesWriteRepository } from './shift-exchanges.write.repository';

describe('ShiftExchangesWriteRepository', () => {
  let repository: ShiftExchangesWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftExchangesWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbShiftExchange: {
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
            dbShift: {
              update: vi.fn(),
            },
            $transaction: vi.fn((ops) => Promise.all(ops)),
          },
        },
      ],
    }).compile();

    repository = module.get<ShiftExchangesWriteRepository>(ShiftExchangesWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createExchange', () => {
    it('should call dbShiftExchange.create with target', async () => {
      const shiftId = asShiftId('shift-1');
      const reqId = asUserId('user-1');
      const targetId = asUserId('user-2');

      await repository.createExchange(shiftId, reqId, targetId);

      expect(dbService.dbShiftExchange.create).toHaveBeenCalledWith({
        data: {
          shift: { connect: { id: shiftId } },
          requester: { connect: { id: reqId } },
          target: { connect: { id: targetId } },
          status: ShiftExchangeStatus.PENDING,
        },
        include: {
          shift: true,
          requester: { select: { id: true, name: true } },
        },
      });
    });

    it('should call dbShiftExchange.create without target', async () => {
      const shiftId = asShiftId('shift-1');
      const reqId = asUserId('user-1');

      await repository.createExchange(shiftId, reqId);

      expect(dbService.dbShiftExchange.create).toHaveBeenCalledWith({
        data: {
          shift: { connect: { id: shiftId } },
          requester: { connect: { id: reqId } },
          status: ShiftExchangeStatus.PENDING,
        },
        include: {
          shift: true,
          requester: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('acceptExchangeAndSwapShift', () => {
    it('should call db.$transaction with update exchange and update shift', async () => {
      const exchangeId = asShiftExchangeId('exc-1');
      const shiftId = asShiftId('shift-1');
      const newUserId = asUserId('user-2');

      await repository.acceptExchangeAndSwapShift(exchangeId, shiftId, newUserId);

      expect(dbService.$transaction).toHaveBeenCalled();
      expect(dbService.dbShiftExchange.update).toHaveBeenCalledWith({
        where: { id: exchangeId },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
        include: { shift: true, requester: { select: { id: true, name: true } } },
      });
      expect(dbService.dbShift.update).toHaveBeenCalledWith({
        where: { id: shiftId },
        data: { userId: newUserId },
      });
    });
  });

  describe('deleteExchange', () => {
    it('should call dbShiftExchange.delete', async () => {
      const exchangeId = asShiftExchangeId('exc-1');
      await repository.deleteExchange(exchangeId);
      expect(dbService.dbShiftExchange.delete).toHaveBeenCalledWith({
        where: { id: exchangeId },
      });
    });
  });
});

import { ShiftExchangeStatus, asShiftExchangeId, asShiftId, asUserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
              updateMany: vi.fn().mockResolvedValue({ count: 1 }),
              delete: vi.fn(),
            },
            dbShift: {
              update: vi.fn(),
            },
            $transaction: vi.fn((run: (tx: unknown) => unknown) => run(dbService)),
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
    it('should claim the offer and hand the shift over in one transaction', async () => {
      const exchangeId = asShiftExchangeId('exc-1');
      const shiftId = asShiftId('shift-1');
      const newUserId = asUserId('user-2');

      const claimed = await repository.acceptExchangeAndSwapShift(exchangeId, shiftId, newUserId);

      expect(claimed).toBe(true);
      expect(dbService.$transaction).toHaveBeenCalled();
      expect(dbService.dbShiftExchange.updateMany).toHaveBeenCalledWith({
        where: { id: exchangeId, status: ShiftExchangeStatus.PENDING },
        data: { status: ShiftExchangeStatus.APPROVED, targetId: newUserId },
      });
      expect(dbService.dbShift.update).toHaveBeenCalledWith({
        where: { id: shiftId },
        data: { userId: newUserId },
      });
    });

    it('should leave the shift alone when somebody else claimed the offer first', async () => {
      (dbService.dbShiftExchange.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const claimed = await repository.acceptExchangeAndSwapShift(
        asShiftExchangeId('exc-1'),
        asShiftId('shift-1'),
        asUserId('user-2'),
      );

      expect(claimed).toBe(false);
      expect(dbService.dbShift.update).not.toHaveBeenCalled();
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

import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asOrderId } from '../../core';
import { DbService } from '../../core/db';
import { OrdersWriteRepository } from './orders.write.repository';

describe('OrdersWriteRepository', () => {
  let repository: OrdersWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbOrder: {
              delete: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
            },
            dbTable: {
              update: vi.fn(),
            },
            $transaction: vi.fn(async (cb) => {
              const mockTx = {
                dbOrder: { create: vi.fn(), update: vi.fn() },
                dbTable: { update: vi.fn() },
                dbOrderItem: { createMany: vi.fn(), delete: vi.fn(), update: vi.fn(), findMany: vi.fn() },
              };
              return cb(mockTx);
            }),
          },
        },
      ],
    }).compile();

    repository = module.get<OrdersWriteRepository>(OrdersWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('deleteOrder', () => {
    it('should call dbOrder.delete', async () => {
      const orderId = asOrderId('order-1');
      await repository.deleteOrder(orderId);
      expect(dbService.dbOrder.delete).toHaveBeenCalledWith({
        where: { id: orderId },
      });
    });
  });

  describe('createOrder', () => {
    it('should execute transaction successfully', async () => {
      const barId = asBarId('bar-1');
      const dto = { tableId: 'table-1', items: [] };
      const priceMap = new Map();
      const totalAmount = 0;

      await repository.createOrder(barId, dto as any, priceMap, totalAmount, 'Table 1');
      expect(dbService.$transaction).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should execute transaction successfully', async () => {
      const orderId = asOrderId('order-1');
      await repository.cancelOrder(orderId, 'table-1');
      expect(dbService.$transaction).toHaveBeenCalled();
    });
  });
});

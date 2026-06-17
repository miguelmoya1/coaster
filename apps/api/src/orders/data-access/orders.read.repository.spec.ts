import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrdersReadRepository } from './orders.read.repository';
import { DbService, DbOrderStatus } from '../../db';
import { asBarId, asOrderId, asOrderItemId, asTableId } from '../../core';

describe('OrdersReadRepository', () => {
  let repository: OrdersReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersReadRepository,
        {
          provide: DbService,
          useValue: {
            dbOrder: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
            dbOrderItem: {
              findUnique: vi.fn(),
            },
            dbTable: {
              findUnique: vi.fn(),
            },
            dbProduct: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<OrdersReadRepository>(OrdersReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByBarId', () => {
    it('should call dbOrder.findMany', async () => {
      const barId = asBarId('bar-1');
      await repository.findByBarId(barId);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { barId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should call dbOrder.findMany with status', async () => {
      const barId = asBarId('bar-1');
      await repository.findByBarId(barId, DbOrderStatus.OPEN);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { barId, status: DbOrderStatus.OPEN },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByBarIdAndDate', () => {
    it('should call dbOrder.findMany with date range', async () => {
      const barId = asBarId('bar-1');
      await repository.findByBarIdAndDate(barId, '2023-01-01');
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { barId, createdAt: { gte: expect.any(Date), lte: expect.any(Date) } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should call dbOrder.findUnique', async () => {
      const orderId = asOrderId('order-1');
      await repository.findById(orderId);
      expect(dbService.dbOrder.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: expect.any(Object),
      });
    });
  });

  describe('findItemById', () => {
    it('should call dbOrderItem.findUnique', async () => {
      const itemId = asOrderItemId('item-1');
      await repository.findItemById(itemId);
      expect(dbService.dbOrderItem.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
    });
  });

  describe('findTableById', () => {
    it('should call dbTable.findUnique', async () => {
      const tableId = asTableId('table-1');
      await repository.findTableById(tableId);
      expect(dbService.dbTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
      });
    });
  });

  describe('findProductsByIds', () => {
    it('should call dbProduct.findMany', async () => {
      await repository.findProductsByIds(['prod-1']);
      expect(dbService.dbProduct.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['prod-1'] } },
      });
    });
  });

  describe('findOrdersByIds', () => {
    it('should call dbOrder.findMany', async () => {
      await repository.findOrdersByIds([asOrderId('order-1')]);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1'] } },
        include: expect.any(Object),
      });
    });
  });
});

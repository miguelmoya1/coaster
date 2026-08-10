import { asEstablishmentId, asOrderId, asOrderItemId, asTableId } from '@coaster/common';
import { DbOrderStatus, DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersReadRepository } from './orders.read.repository';

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

  describe('findByEstablishmentId', () => {
    it('should call dbOrder.findMany', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      await repository.findByEstablishmentId(establishmentId);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { establishmentId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should call dbOrder.findMany with status', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      await repository.findByEstablishmentId(establishmentId, DbOrderStatus.OPEN);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { establishmentId, status: DbOrderStatus.OPEN },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByEstablishmentIdAndDate', () => {
    it('should call dbOrder.findMany with date range', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      await repository.findByEstablishmentIdAndDate(establishmentId, '2023-01-01');
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { establishmentId, createdAt: { gte: expect.any(Date), lte: expect.any(Date) } },
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
    it('should only look at live products of the establishment making the order', async () => {
      await repository.findProductsByIds(asEstablishmentId('establishment-1'), ['prod-1']);
      expect(dbService.dbProduct.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1'] },
          deletedAt: null,
          category: { establishmentId: 'establishment-1', deletedAt: null },
        },
      });
    });
  });

  describe('findOrdersByIds', () => {
    it('should return them oldest first so a merge always keeps the same order', async () => {
      await repository.findOrdersByIds([asOrderId('order-1')]);
      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1'] } },
        include: expect.any(Object),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    });
  });
});

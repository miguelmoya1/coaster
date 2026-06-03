import { asBarId, asOrderId, asTableId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { PrismaService } from '../../core';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  let repository: OrdersRepository;
  let prisma: {
    dbOrder: { findMany: Mock; findUnique: Mock };
    dbOrderItem: { findUnique: Mock };
    dbTable: { findUnique: Mock };
    dbProduct: { findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<OrdersRepository>(OrdersRepository);
    prisma = module.get(PrismaService);
  });

  describe('findByBarId', () => {
    it('should find orders by bar id with includes', async () => {
      const barId = asBarId('bar-1');
      prisma.dbOrder.findMany.mockResolvedValue([]);

      const result = await repository.findByBarId(barId);

      expect(prisma.dbOrder.findMany).toHaveBeenCalledWith({
        where: { barId },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
    });

    it('should filter by status when provided', async () => {
      const barId = asBarId('bar-1');
      prisma.dbOrder.findMany.mockResolvedValue([]);

      await repository.findByBarId(barId, 'OPEN');

      expect(prisma.dbOrder.findMany).toHaveBeenCalledWith({
        where: { barId, status: 'OPEN' },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should find an order by id with includes', async () => {
      const orderId = asOrderId('order-1');
      prisma.dbOrder.findUnique.mockResolvedValue({ id: orderId });

      const result = await repository.findById(orderId);

      expect(prisma.dbOrder.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
      expect(result).toEqual({ id: orderId });
    });
  });

  describe('findTableById', () => {
    it('should find a table by id', async () => {
      const tableId = asTableId('table-1');
      prisma.dbTable.findUnique.mockResolvedValue({ id: tableId });

      const result = await repository.findTableById(tableId);

      expect(prisma.dbTable.findUnique).toHaveBeenCalledWith({
        where: { id: tableId },
      });
      expect(result).toEqual({ id: tableId });
    });
  });

  describe('findProductsByIds', () => {
    it('should find products by an array of ids', async () => {
      const ids = ['prod-1', 'prod-2'];
      prisma.dbProduct.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }]);

      const result = await repository.findProductsByIds(ids);

      expect(prisma.dbProduct.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOrdersByIds', () => {
    it('should find orders by an array of ids with includes', async () => {
      const ids = ['order-1', 'order-2'];
      prisma.dbOrder.findMany.mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]);

      const result = await repository.findOrdersByIds(ids);

      expect(prisma.dbOrder.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
      expect(result).toHaveLength(2);
    });
  });
});

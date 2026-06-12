import type { BarId, OrderId, OrderItemId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class OrdersReadRepository {
  constructor(private readonly _prisma: DbService) {}

  async findByBarId(barId: BarId, status?: string) {
    return this._prisma.dbOrder.findMany({
      where: {
        barId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBarIdAndDate(barId: BarId, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this._prisma.dbOrder.findMany({
      where: {
        barId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(orderId: OrderId) {
    return this._prisma.dbOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
    });
  }

  async findItemById(itemId: OrderItemId) {
    return this._prisma.dbOrderItem.findUnique({
      where: { id: itemId },
    });
  }

  async findTableById(tableId: TableId) {
    return this._prisma.dbTable.findUnique({
      where: { id: tableId },
    });
  }

  async findProductsByIds(productIds: string[]) {
    return this._prisma.dbProduct.findMany({
      where: { id: { in: productIds } },
    });
  }

  async findOrdersByIds(orderIds: OrderId[]) {
    return this._prisma.dbOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
    });
  }
}

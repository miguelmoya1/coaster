import { BarId, OrderId, OrderItemId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core';

@Injectable()
export class OrdersRepository {
  constructor(private readonly _prisma: PrismaService) {}

  get prisma() {
    return this._prisma;
  }

  async findByBarId(barId: BarId, status?: string) {
    return this._prisma.order.findMany({
      where: {
        barId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        items: { include: { product: true } },
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

    return this._prisma.order.findMany({
      where: {
        barId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: { include: { product: true } },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOrder(orderId: OrderId) {
    return this._prisma.order.delete({
      where: { id: orderId },
    });
  }

  async findById(orderId: OrderId) {
    return this._prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        table: true,
      },
    });
  }

  async findItemById(itemId: OrderItemId) {
    return this._prisma.orderItem.findUnique({
      where: { id: itemId },
    });
  }

  async findTableById(tableId: TableId) {
    return this._prisma.table.findUnique({
      where: { id: tableId },
    });
  }

  async findProductsByIds(productIds: string[]) {
    return this._prisma.product.findMany({
      where: { id: { in: productIds } },
    });
  }

  async findOrdersByIds(orderIds: string[]) {
    return this._prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: { include: { product: true } },
        table: true,
      },
    });
  }
}

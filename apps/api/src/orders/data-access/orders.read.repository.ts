import type { BarId, OrderId, OrderItemId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbOrderStatus, DbService } from '../../core/db';

@Injectable()
export class OrdersReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByBarId(barId: BarId, status?: DbOrderStatus) {
    return this._db.dbOrder.findMany({
      where: {
        barId,
        ...(status ? { status } : {}),
      },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByBarIdAndDate(barId: BarId, date: string) {
    const plainDate = Temporal.PlainDate.from(date);
    const startInstant = plainDate.toZonedDateTime({ timeZone: 'UTC' }).startOfDay().toInstant();
    const endInstant = plainDate
      .add({ days: 1 })
      .toZonedDateTime({ timeZone: 'UTC' })
      .startOfDay()
      .toInstant()
      .subtract({ nanoseconds: 1 });

    const start = new Date(startInstant.epochMilliseconds);
    const end = new Date(endInstant.epochMilliseconds);

    return this._db.dbOrder.findMany({
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

  public async findById(orderId: OrderId) {
    return this._db.dbOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
    });
  }

  public async findItemById(itemId: OrderItemId) {
    return this._db.dbOrderItem.findUnique({
      where: { id: itemId },
    });
  }

  public async findTableById(tableId: TableId) {
    return this._db.dbTable.findUnique({
      where: { id: tableId },
    });
  }

  public async findProductsByIds(productIds: string[]) {
    return this._db.dbProduct.findMany({
      where: { id: { in: productIds } },
    });
  }

  public async findOrdersByIds(orderIds: OrderId[]) {
    return this._db.dbOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        table: true,
      },
    });
  }
}

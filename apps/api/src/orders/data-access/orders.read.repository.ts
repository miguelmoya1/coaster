import type { EstablishmentId, OrderId, OrderItemId, TableId } from '@coaster/common';
import { DbOrderStatus, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { ORDER_RELATIONS } from './order-relations';

@Injectable()
export class OrdersReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByEstablishmentId(establishmentId: EstablishmentId, status?: DbOrderStatus) {
    return this._db.dbOrder.findMany({
      where: {
        establishmentId,
        ...(status ? { status } : {}),
      },
      include: ORDER_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findByEstablishmentIdAndDate(establishmentId: EstablishmentId, date: string) {
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
        establishmentId,
        createdAt: { gte: start, lte: end },
      },
      include: ORDER_RELATIONS,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findById(orderId: OrderId) {
    return this._db.dbOrder.findUnique({
      where: { id: orderId },
      include: ORDER_RELATIONS,
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

  public async findProductsByIds(establishmentId: EstablishmentId, productIds: string[]) {
    return this._db.dbProduct.findMany({
      where: { id: { in: productIds }, deletedAt: null, category: { establishmentId, deletedAt: null } },
    });
  }

  public async findOrdersByIds(orderIds: OrderId[]) {
    return this._db.dbOrder.findMany({
      where: { id: { in: orderIds } },
      include: ORDER_RELATIONS,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}

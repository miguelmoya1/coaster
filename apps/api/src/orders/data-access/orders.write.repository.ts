import type { AddOrderItemsDto, BarId, CreateOrderDto, OrderId, OrderItemId, TableId } from '@coaster/common';
import { PaymentMethod } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import {
  DbDeliveryStatus,
  DbOrderStatus,
  DbPaymentMethod,
  DbPaymentStatus,
  DbService,
  DbTableStatus,
} from '../../core/db';

@Injectable()
export class OrdersWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async deleteOrder(orderId: OrderId) {
    return this._db.dbOrder.delete({
      where: { id: orderId },
    });
  }

  public async removeItemAndRecalculate(orderId: OrderId, itemId: OrderItemId) {
    return this._db.$transaction(async (tx) => {
      await tx.dbOrderItem.delete({ where: { id: itemId } });

      const allItems = await tx.dbOrderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

      return tx.dbOrder.update({
        where: { id: orderId },
        data: { totalAmount },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  public async removeLastItemAndCancel(orderId: OrderId, itemId: OrderItemId, tableId: TableId | null) {
    return this._db.$transaction(async (tx) => {
      await tx.dbOrderItem.delete({ where: { id: itemId } });

      const updated = await tx.dbOrder.update({
        where: { id: orderId },
        data: { status: DbOrderStatus.CANCELLED, totalAmount: 0 },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: DbTableStatus.FREE },
        });
      }

      return updated;
    });
  }

  public async createOrder(
    barId: BarId,
    dto: CreateOrderDto,
    priceMap: Map<string, number>,
    totalAmount: number,
    resolvedTableName: string | null,
  ) {
    return this._db.$transaction(async (tx) => {
      const created = await tx.dbOrder.create({
        data: {
          barId,
          tableId: dto.tableId ?? null,
          tableName: resolvedTableName,
          status: DbOrderStatus.OPEN,
          totalAmount,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: priceMap.get(item.productId) ?? 0,
            })),
          },
        },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (dto.tableId) {
        await tx.dbTable.update({
          where: { id: dto.tableId },
          data: { status: DbTableStatus.OCCUPIED },
        });
      }

      return created;
    });
  }

  public async addItemsToOrder(
    orderId: OrderId,
    additionalAmount: number,
    dto: AddOrderItemsDto,
    priceMap: Map<string, number>,
    currentTotalAmount: number,
  ) {
    return this._db.$transaction(async (tx) => {
      await tx.dbOrderItem.createMany({
        data: dto.items.map((item) => ({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: priceMap.get(item.productId) ?? 0,
        })),
      });

      return tx.dbOrder.update({
        where: { id: orderId },
        data: { totalAmount: currentTotalAmount + additionalAmount },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  public async updateOrderItem(
    itemId: OrderItemId,
    data: {
      paymentStatus?: DbPaymentStatus;
      deliveryStatus?: DbDeliveryStatus;
      paidQuantity?: number;
      servedQuantity?: number;
    },
  ) {
    return this._db.dbOrderItem.update({
      where: { id: itemId },
      data,
    });
  }

  public async bulkUpdate(
    orderId: OrderId,
    updates: {
      itemId: string;
      paidQuantity?: number;
      servedQuantity?: number;
      paymentMethod?: DbPaymentMethod;
    }[],
  ) {
    return this._db.$transaction(async (tx) => {
      for (const update of updates) {
        const item = await tx.dbOrderItem.findUnique({ where: { id: update.itemId } });
        if (!item || item.orderId !== orderId) {
          continue;
        }

        const dataToUpdate: Record<string, unknown> = {};

        if (update.paidQuantity !== undefined) {
          const newPaidQuantity = update.paidQuantity;
          dataToUpdate.paidQuantity = newPaidQuantity;
          dataToUpdate.paymentStatus =
            newPaidQuantity === item.quantity
              ? DbPaymentStatus.PAID
              : newPaidQuantity === 0
                ? DbPaymentStatus.PENDING
                : DbPaymentStatus.PARTIAL;

          const diff = newPaidQuantity - item.paidQuantity;
          let newCard = item.paidQuantityCard;
          let newCash = item.paidQuantityCash;

          if (diff > 0) {
            if (update.paymentMethod === PaymentMethod.CARD) {
              newCard = item.paidQuantityCard + diff;
            } else if (update.paymentMethod === PaymentMethod.CASH) {
              newCash = item.paidQuantityCash + diff;
            } else {
              newCash = item.paidQuantityCash + diff;
            }
          } else if (diff < 0) {
            let toReduce = Math.abs(diff);
            if (newCard >= toReduce) {
              newCard -= toReduce;
              toReduce = 0;
            } else {
              toReduce -= newCard;
              newCard = 0;
            }
            if (toReduce > 0) {
              newCash = Math.max(0, newCash - toReduce);
            }
          }

          dataToUpdate.paidQuantityCard = newCard;
          dataToUpdate.paidQuantityCash = newCash;

          if (newCard > 0 && newCash > 0) {
            dataToUpdate.paymentMethod = DbPaymentMethod.MIXED;
          } else if (newCard > 0) {
            dataToUpdate.paymentMethod = DbPaymentMethod.CARD;
          } else if (newCash > 0) {
            dataToUpdate.paymentMethod = DbPaymentMethod.CASH;
          } else {
            dataToUpdate.paymentMethod = DbPaymentMethod.NONE;
          }
        }

        if (update.servedQuantity !== undefined) {
          const newServedQuantity = update.servedQuantity;
          dataToUpdate.servedQuantity = newServedQuantity;
          dataToUpdate.deliveryStatus =
            newServedQuantity === item.quantity
              ? DbDeliveryStatus.SERVED
              : newServedQuantity === 0
                ? DbDeliveryStatus.PENDING
                : DbDeliveryStatus.PARTIAL;
        }

        if (Object.keys(dataToUpdate).length > 0) {
          await tx.dbOrderItem.update({
            where: { id: update.itemId },
            data: dataToUpdate,
          });
        }
      }

      const allItems = await tx.dbOrderItem.findMany({ where: { orderId } });
      let amountPaidCash = 0;
      let amountPaidCard = 0;
      for (const item of allItems) {
        amountPaidCash += item.paidQuantityCash * item.priceAtPurchase;
        amountPaidCard += item.paidQuantityCard * item.priceAtPurchase;
      }

      let orderPaymentMethod: DbPaymentMethod = DbPaymentMethod.NONE;
      if (amountPaidCash > 0 && amountPaidCard > 0) {
        orderPaymentMethod = DbPaymentMethod.MIXED;
      } else if (amountPaidCard > 0) {
        orderPaymentMethod = DbPaymentMethod.CARD;
      } else if (amountPaidCash > 0) {
        orderPaymentMethod = DbPaymentMethod.CASH;
      }

      return tx.dbOrder.update({
        where: { id: orderId },
        data: {
          paymentMethod: orderPaymentMethod,
          amountPaidCash,
          amountPaidCard,
        },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  public async cancelOrder(orderId: OrderId, tableId: string | null) {
    return this._db.$transaction(async (tx) => {
      const cancelled = await tx.dbOrder.update({
        where: { id: orderId },
        data: { status: DbOrderStatus.CANCELLED },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: DbTableStatus.FREE },
        });
      }

      return cancelled;
    });
  }

  public async moveTable(orderId: OrderId, oldTableId: string | null, newTableId: string, newTableName: string) {
    return this._db.$transaction(async (tx) => {
      if (oldTableId) {
        await tx.dbTable.update({
          where: { id: oldTableId },
          data: { status: DbTableStatus.FREE },
        });
      }

      await tx.dbTable.update({
        where: { id: newTableId },
        data: { status: DbTableStatus.OCCUPIED },
      });

      return tx.dbOrder.update({
        where: { id: orderId },
        data: { tableId: newTableId, tableName: newTableName },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  async mergeOrders(
    primaryOrderId: OrderId,
    sourceOrdersData: { id: OrderId; tableId: string | null }[],
    targetTableId: string | null,
    primaryOrderTableId: string | null,
    primaryOrderTableName: string | null,
  ) {
    return this._db.$transaction(async (tx) => {
      for (const source of sourceOrdersData) {
        await tx.dbOrderItem.updateMany({
          where: { orderId: source.id },
          data: { orderId: primaryOrderId },
        });

        await tx.dbOrder.update({
          where: { id: source.id },
          data: { status: DbOrderStatus.CANCELLED },
        });

        if (source.tableId) {
          await tx.dbTable.update({
            where: { id: source.tableId },
            data: { status: DbTableStatus.FREE },
          });
        }
      }

      if (targetTableId) {
        if (primaryOrderTableId && primaryOrderTableId !== targetTableId) {
          await tx.dbTable.update({
            where: { id: primaryOrderTableId },
            data: { status: DbTableStatus.FREE },
          });
        }

        await tx.dbTable.update({
          where: { id: targetTableId },
          data: { status: DbTableStatus.OCCUPIED },
        });
      }

      const allItems = await tx.dbOrderItem.findMany({ where: { orderId: primaryOrderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      let mergedTableName = primaryOrderTableName;
      if (targetTableId) {
        const targetTable = await tx.dbTable.findUnique({ where: { id: targetTableId } });
        mergedTableName = targetTable?.name ?? mergedTableName;
      }

      return tx.dbOrder.update({
        where: { id: primaryOrderId },
        data: {
          totalAmount,
          tableId: targetTableId ?? primaryOrderTableId,
          tableName: mergedTableName,
        },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  async checkoutOrder(orderId: OrderId, tableId: string | null, paymentMethod: PaymentMethod) {
    return this._db.$transaction(async (tx) => {
      const unpaidItems = await tx.dbOrderItem.findMany({
        where: {
          orderId,
          NOT: { paymentStatus: DbPaymentStatus.PAID },
        },
      });

      for (const item of unpaidItems) {
        const unpaid = item.quantity - item.paidQuantity;
        let newCard = item.paidQuantityCard;
        let newCash = item.paidQuantityCash;
        if (paymentMethod === DbPaymentMethod.CARD) {
          newCard += unpaid;
        } else {
          newCash += unpaid;
        }

        let newItemPaymentMethod: DbPaymentMethod = DbPaymentMethod.NONE;
        if (newCard > 0 && newCash > 0) {
          newItemPaymentMethod = DbPaymentMethod.MIXED;
        } else if (newCard > 0) {
          newItemPaymentMethod = DbPaymentMethod.CARD;
        } else if (newCash > 0) {
          newItemPaymentMethod = DbPaymentMethod.CASH;
        }

        await tx.dbOrderItem.update({
          where: { id: item.id },
          data: {
            paymentStatus: DbPaymentStatus.PAID,
            paidQuantity: item.quantity,
            paidQuantityCard: newCard,
            paidQuantityCash: newCash,
            paymentMethod: newItemPaymentMethod,
          },
        });
      }

      const allItems = await tx.dbOrderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      let amountPaidCash = 0;
      let amountPaidCard = 0;
      for (const item of allItems) {
        amountPaidCash += item.paidQuantityCash * item.priceAtPurchase;
        amountPaidCard += item.paidQuantityCard * item.priceAtPurchase;
      }

      let orderPaymentMethod: DbPaymentMethod = DbPaymentMethod.NONE;
      if (amountPaidCash > 0 && amountPaidCard > 0) {
        orderPaymentMethod = DbPaymentMethod.MIXED;
      } else if (amountPaidCard > 0) {
        orderPaymentMethod = DbPaymentMethod.CARD;
      } else if (amountPaidCash > 0) {
        orderPaymentMethod = DbPaymentMethod.CASH;
      }

      const closed = await tx.dbOrder.update({
        where: { id: orderId },
        data: {
          status: DbOrderStatus.CLOSED,
          totalAmount,
          paymentMethod: orderPaymentMethod,
          amountPaidCash,
          amountPaidCard,
        },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: DbTableStatus.FREE },
        });
      }

      return closed;
    });
  }
}

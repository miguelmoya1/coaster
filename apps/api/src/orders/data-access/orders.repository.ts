import type { AddOrderItemsDto, BarId, CreateOrderDto, OrderId, OrderItemId, TableId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db';

@Injectable()
export class OrdersRepository {
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

  async deleteOrder(orderId: OrderId) {
    return this._prisma.dbOrder.delete({
      where: { id: orderId },
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

  async removeItemAndRecalculate(orderId: OrderId, itemId: OrderItemId) {
    return this._prisma.$transaction(async (tx) => {
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

  async removeLastItemAndCancel(orderId: OrderId, itemId: OrderItemId, tableId: TableId | null) {
    return this._prisma.$transaction(async (tx) => {
      await tx.dbOrderItem.delete({ where: { id: itemId } });

      const updated = await tx.dbOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', totalAmount: 0 },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: 'FREE' },
        });
      }

      return updated;
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

  async createOrder(
    barId: BarId,
    dto: CreateOrderDto,
    priceMap: Map<string, number>,
    totalAmount: number,
    resolvedTableName: string | null,
  ) {
    return this._prisma.$transaction(async (tx) => {
      const created = await tx.dbOrder.create({
        data: {
          barId,
          tableId: dto.tableId ?? null,
          tableName: resolvedTableName,
          status: 'OPEN',
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
          data: { status: 'OCCUPIED' },
        });
      }

      return created;
    });
  }

  async addItemsToOrder(
    orderId: OrderId,
    additionalAmount: number,
    dto: AddOrderItemsDto,
    priceMap: Map<string, number>,
    currentTotalAmount: number,
  ) {
    return this._prisma.$transaction(async (tx) => {
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

  async updateOrderItem(
    itemId: OrderItemId,
    data: {
      paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
      deliveryStatus?: 'PENDING' | 'PARTIAL' | 'SERVED';
      paidQuantity?: number;
      servedQuantity?: number;
    },
  ) {
    return this._prisma.dbOrderItem.update({
      where: { id: itemId },
      data,
    });
  }

  async bulkUpdate(orderId: OrderId, updates: { itemId: string; paidQuantity?: number; servedQuantity?: number }[]) {
    return this._prisma.$transaction(async (tx) => {
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
            newPaidQuantity === item.quantity ? 'PAID' : newPaidQuantity === 0 ? 'PENDING' : 'PARTIAL';
        }

        if (update.servedQuantity !== undefined) {
          const newServedQuantity = update.servedQuantity;
          dataToUpdate.servedQuantity = newServedQuantity;
          dataToUpdate.deliveryStatus =
            newServedQuantity === item.quantity ? 'SERVED' : newServedQuantity === 0 ? 'PENDING' : 'PARTIAL';
        }

        if (Object.keys(dataToUpdate).length > 0) {
          await tx.dbOrderItem.update({
            where: { id: update.itemId },
            data: dataToUpdate,
          });
        }
      }

      return tx.dbOrder.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  async checkoutOrder(orderId: OrderId, tableId: string | null) {
    return this._prisma.$transaction(async (tx) => {
      const unpaidItems = await tx.dbOrderItem.findMany({
        where: {
          orderId,
          NOT: { paymentStatus: 'PAID' },
        },
      });

      for (const item of unpaidItems) {
        await tx.dbOrderItem.update({
          where: { id: item.id },
          data: {
            paymentStatus: 'PAID',
            paidQuantity: item.quantity,
          },
        });
      }

      const allItems = await tx.dbOrderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      const closed = await tx.dbOrder.update({
        where: { id: orderId },
        data: { status: 'CLOSED', totalAmount },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: 'FREE' },
        });
      }

      return closed;
    });
  }

  async cancelOrder(orderId: OrderId, tableId: string | null) {
    return this._prisma.$transaction(async (tx) => {
      const cancelled = await tx.dbOrder.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.dbTable.update({
          where: { id: tableId },
          data: { status: 'FREE' },
        });
      }

      return cancelled;
    });
  }

  async moveTable(orderId: OrderId, oldTableId: string | null, newTableId: string, newTableName: string) {
    return this._prisma.$transaction(async (tx) => {
      if (oldTableId) {
        await tx.dbTable.update({
          where: { id: oldTableId },
          data: { status: 'FREE' },
        });
      }

      await tx.dbTable.update({
        where: { id: newTableId },
        data: { status: 'OCCUPIED' },
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
    return this._prisma.$transaction(async (tx) => {
      for (const source of sourceOrdersData) {
        await tx.dbOrderItem.updateMany({
          where: { orderId: source.id },
          data: { orderId: primaryOrderId },
        });

        await tx.dbOrder.update({
          where: { id: source.id },
          data: { status: 'CANCELLED' },
        });

        if (source.tableId) {
          await tx.dbTable.update({
            where: { id: source.tableId },
            data: { status: 'FREE' },
          });
        }
      }

      if (targetTableId) {
        if (primaryOrderTableId && primaryOrderTableId !== targetTableId) {
          await tx.dbTable.update({
            where: { id: primaryOrderTableId },
            data: { status: 'FREE' },
          });
        }

        await tx.dbTable.update({
          where: { id: targetTableId },
          data: { status: 'OCCUPIED' },
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
}

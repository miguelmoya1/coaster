import { AddOrderItemsDto, BarId, CreateOrderDto, ErrorCodes, OrderId, OrderItemId, TableId } from '@coaster/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core';

@Injectable()
export class OrdersRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async findByBarId(barId: BarId, status?: string) {
    return this._prisma.order.findMany({
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

    return this._prisma.order.findMany({
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
    return this._prisma.order.delete({
      where: { id: orderId },
    });
  }

  async findById(orderId: OrderId) {
    return this._prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
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

  async removeItemAndRecalculate(orderId: OrderId, itemId: OrderItemId) {
    return this._prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });

      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);

      return tx.order.update({
        where: { id: orderId },
        data: { totalAmount },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  async removeLastItemAndCancel(orderId: OrderId, itemId: OrderItemId, tableId: string | null) {
    return this._prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', totalAmount: 0 },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'FREE' },
        });
      }

      return updated;
    });
  }

  async findOrdersByIds(orderIds: string[]) {
    return this._prisma.order.findMany({
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
      const created = await tx.order.create({
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
        await tx.table.update({
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
      await tx.orderItem.createMany({
        data: dto.items.map((item) => ({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: priceMap.get(item.productId) ?? 0,
        })),
      });

      return tx.order.update({
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
    return this._prisma.orderItem.update({
      where: { id: itemId },
      data,
    });
  }

  async bulkPay(orderId: OrderId, updates: { itemId: string; paidQuantity: number }[]) {
    return this._prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const item = await tx.orderItem.findUnique({ where: { id: update.itemId } });
        if (!item || item.orderId !== orderId) {
          throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
        }
        const newPaidQuantity = update.paidQuantity;
        if (newPaidQuantity > item.quantity) {
          throw new BadRequestException('PAY_QUANTITY_EXCEEDS_TOTAL');
        }
        if (newPaidQuantity < 0) {
          throw new BadRequestException('PAY_QUANTITY_CANNOT_BE_NEGATIVE');
        }
        const newPaymentStatus =
          newPaidQuantity === item.quantity ? 'PAID' : newPaidQuantity === 0 ? 'PENDING' : 'PARTIAL';
        await tx.orderItem.update({
          where: { id: update.itemId },
          data: {
            paidQuantity: newPaidQuantity,
            paymentStatus: newPaymentStatus,
          },
        });
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });
    });
  }

  async bulkServe(orderId: OrderId, updates: { itemId: string; servedQuantity: number }[]) {
    return this._prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const item = await tx.orderItem.findUnique({ where: { id: update.itemId } });
        if (!item || item.orderId !== orderId) {
          throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
        }
        const newServedQuantity = update.servedQuantity;
        if (newServedQuantity > item.quantity) {
          throw new BadRequestException('SERVE_QUANTITY_EXCEEDS_TOTAL');
        }
        if (newServedQuantity < 0) {
          throw new BadRequestException('SERVE_QUANTITY_CANNOT_BE_NEGATIVE');
        }
        const newDeliveryStatus =
          newServedQuantity === item.quantity ? 'SERVED' : newServedQuantity === 0 ? 'PENDING' : 'PARTIAL';
        await tx.orderItem.update({
          where: { id: update.itemId },
          data: {
            servedQuantity: newServedQuantity,
            deliveryStatus: newDeliveryStatus,
          },
        });
      }

      return tx.order.findUnique({
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
      const unpaidItems = await tx.orderItem.findMany({
        where: {
          orderId,
          NOT: { paymentStatus: 'PAID' },
        },
      });

      for (const item of unpaidItems) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            paymentStatus: 'PAID',
            paidQuantity: item.quantity,
          },
        });
      }

      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      const closed = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED', totalAmount },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: 'FREE' },
        });
      }

      return closed;
    });
  }

  async cancelOrder(orderId: OrderId, tableId: string | null) {
    return this._prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: {
          items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
          table: true,
        },
      });

      if (tableId) {
        await tx.table.update({
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
        await tx.table.update({
          where: { id: oldTableId },
          data: { status: 'FREE' },
        });
      }

      await tx.table.update({
        where: { id: newTableId },
        data: { status: 'OCCUPIED' },
      });

      return tx.order.update({
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
        await tx.orderItem.updateMany({
          where: { orderId: source.id },
          data: { orderId: primaryOrderId },
        });

        await tx.order.update({
          where: { id: source.id },
          data: { status: 'CANCELLED' },
        });

        if (source.tableId) {
          await tx.table.update({
            where: { id: source.tableId },
            data: { status: 'FREE' },
          });
        }
      }

      if (targetTableId) {
        if (primaryOrderTableId && primaryOrderTableId !== targetTableId) {
          await tx.table.update({
            where: { id: primaryOrderTableId },
            data: { status: 'FREE' },
          });
        }

        await tx.table.update({
          where: { id: targetTableId },
          data: { status: 'OCCUPIED' },
        });
      }

      const allItems = await tx.orderItem.findMany({ where: { orderId: primaryOrderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      let mergedTableName = primaryOrderTableName;
      if (targetTableId) {
        const targetTable = await tx.table.findUnique({ where: { id: targetTableId } });
        mergedTableName = targetTable?.name ?? mergedTableName;
      }

      return tx.order.update({
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

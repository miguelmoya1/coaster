import {
  AddOrderItemsDto,
  asTableId,
  BarId,
  CreateOrderDto,
  ErrorCodes,
  MergeOrdersDto,
  MoveTableDto,
  OrderId,
  OrderItemId,
  SocketEvents,
} from '@coaster/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BarGateway } from '../../core';
import { OrdersRepository } from '../data-access/orders.repository';
import { OrdersMapper } from '../mappers/orders.mapper';

@Injectable()
export class OrdersService {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async getOrdersByBarId(barId: BarId, status?: string) {
    const orders = await this._ordersRepository.findByBarId(barId, status);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }

  async getOrdersByDate(barId: BarId, date: string) {
    const orders = await this._ordersRepository.findByBarIdAndDate(barId, date);
    return orders.map((o) => OrdersMapper.toDomain(o));
  }

  async deleteOrder(barId: BarId, orderId: OrderId) {
    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    if (order.status === 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(order.createdAt);
    if (orderDate < today) {
      throw new BadRequestException('CANNOT_DELETE_PAST_ORDER');
    }

    await this._ordersRepository.deleteOrder(orderId);
    return { success: true };
  }

  async getOrderById(barId: BarId, orderId: OrderId) {
    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    return OrdersMapper.toDomain(order);
  }

  async createOrder(barId: BarId, dto: CreateOrderDto) {
    const prisma = this._ordersRepository.prisma;

    const productIds = dto.items.map((i) => i.productId);
    const products = await this._ordersRepository.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    if (dto.tableId) {
      const table = await this._ordersRepository.findTableById(asTableId(dto.tableId));
      if (!table || table.barId !== barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
      if (table.status === 'OCCUPIED') {
        throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
      }
    }

    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    const totalAmount = dto.items.reduce((sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity, 0);

    let resolvedTableName: string | null = null;
    if (dto.tableId) {
      const table = await this._ordersRepository.findTableById(asTableId(dto.tableId));
      resolvedTableName = table?.name ?? null;
    }

    const order = await prisma.$transaction(async (tx) => {
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
          items: { include: { product: true } },
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

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_CREATED, mapped);

    if (dto.tableId) {
      this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: dto.tableId,
        status: 'OCCUPIED',
      });
    }

    return mapped;
  }

  async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto) {
    const prisma = this._ordersRepository.prisma;

    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this._ordersRepository.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    const additionalAmount = dto.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    );

    const order = await prisma.$transaction(async (tx) => {
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
        data: { totalAmount: existingOrder.totalAmount + additionalAmount },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });
    });

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_ITEM_ADDED, mapped);
    return mapped;
  }

  async payItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const prisma = this._ordersRepository.prisma;

    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }
    if (item.paymentStatus === 'PAID') {
      throw new BadRequestException(ErrorCodes.ORDER_ALREADY_PAID);
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { paymentStatus: 'PAID' },
    });

    const updatedOrder = await this._ordersRepository.findById(orderId);
    const mapped = OrdersMapper.toDomain(updatedOrder!);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }

  async deliverItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const prisma = this._ordersRepository.prisma;

    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { deliveryStatus: 'SERVED' },
    });

    const updatedOrder = await this._ordersRepository.findById(orderId);
    const mapped = OrdersMapper.toDomain(updatedOrder!);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }

  async checkout(barId: BarId, orderId: OrderId) {
    const prisma = this._ordersRepository.prisma;

    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'PAID' },
      });

      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      const closed = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED', totalAmount },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });

      if (existingOrder.tableId) {
        await tx.table.update({
          where: { id: existingOrder.tableId },
          data: { status: 'FREE' },
        });
      }

      return closed;
    });

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_CLOSED, mapped);

    if (existingOrder.tableId) {
      this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: existingOrder.tableId,
        status: 'FREE',
      });
    }

    return mapped;
  }

  async cancelOrder(barId: BarId, orderId: OrderId) {
    const prisma = this._ordersRepository.prisma;

    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });

      if (existingOrder.tableId) {
        await tx.table.update({
          where: { id: existingOrder.tableId },
          data: { status: 'FREE' },
        });
      }

      return cancelled;
    });

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_CANCELLED, mapped);

    if (existingOrder.tableId) {
      this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: existingOrder.tableId,
        status: 'FREE',
      });
    }

    return mapped;
  }

  async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto) {
    const prisma = this._ordersRepository.prisma;

    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const newTable = await this._ordersRepository.findTableById(asTableId(dto.tableId));
    if (!newTable || newTable.barId !== barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }
    if (newTable.status === 'OCCUPIED') {
      throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
    }

    const order = await prisma.$transaction(async (tx) => {
      if (existingOrder.tableId) {
        await tx.table.update({
          where: { id: existingOrder.tableId },
          data: { status: 'FREE' },
        });
      }

      await tx.table.update({
        where: { id: dto.tableId },
        data: { status: 'OCCUPIED' },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { tableId: dto.tableId, tableName: newTable.name },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });
    });

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);

    if (existingOrder.tableId) {
      this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
        id: existingOrder.tableId,
        status: 'FREE',
      });
    }
    this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
      id: dto.tableId,
      status: 'OCCUPIED',
    });

    return mapped;
  }

  async mergeOrders(barId: BarId, dto: MergeOrdersDto) {
    const prisma = this._ordersRepository.prisma;

    const orders = await this._ordersRepository.findOrdersByIds(dto.orderIds);
    if (orders.length !== dto.orderIds.length) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonBarOrders = orders.filter((o) => o.barId !== barId);
    if (nonBarOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_FOUND);
    }

    const nonOpenOrders = orders.filter((o) => o.status !== 'OPEN');
    if (nonOpenOrders.length > 0) {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    if (dto.targetTableId) {
      const targetTable = await this._ordersRepository.findTableById(asTableId(dto.targetTableId));
      if (!targetTable || targetTable.barId !== barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
    }

    const [primaryOrder, ...sourceOrders] = orders;

    const result = await prisma.$transaction(async (tx) => {
      for (const source of sourceOrders) {
        await tx.orderItem.updateMany({
          where: { orderId: source.id },
          data: { orderId: primaryOrder.id },
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

      if (dto.targetTableId) {
        if (primaryOrder.tableId && primaryOrder.tableId !== dto.targetTableId) {
          await tx.table.update({
            where: { id: primaryOrder.tableId },
            data: { status: 'FREE' },
          });
        }

        await tx.table.update({
          where: { id: dto.targetTableId },
          data: { status: 'OCCUPIED' },
        });
      }

      const allItems = await tx.orderItem.findMany({ where: { orderId: primaryOrder.id } });
      const totalAmount = allItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

      let mergedTableName = primaryOrder.tableName;
      if (dto.targetTableId) {
        const targetTable = await tx.table.findUnique({ where: { id: dto.targetTableId } });
        mergedTableName = targetTable?.name ?? mergedTableName;
      }

      return tx.order.update({
        where: { id: primaryOrder.id },
        data: {
          totalAmount,
          tableId: dto.targetTableId ?? primaryOrder.tableId,
          tableName: mergedTableName,
        },
        include: {
          items: { include: { product: true } },
          table: true,
        },
      });
    });

    const mapped = OrdersMapper.toDomain(result);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);

    for (const source of sourceOrders) {
      this._barGateway.server.to(barId).emit(SocketEvents.ORDER_CANCELLED, { id: source.id });
      if (source.tableId) {
        this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: source.tableId,
          status: 'FREE',
        });
      }
    }

    return mapped;
  }

  async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException(ErrorCodes.ORDER_ITEM_NOT_FOUND);
    }

    const remainingItems = order.items.filter((i) => i.id !== itemId);

    if (remainingItems.length === 0) {
      const cancelled = await this._ordersRepository.removeLastItemAndCancel(orderId, itemId, order.tableId);

      const mapped = OrdersMapper.toDomain(cancelled);
      this._barGateway.server.to(barId).emit(SocketEvents.ORDER_CANCELLED, mapped);

      if (order.tableId) {
        this._barGateway.server.to(barId).emit(SocketEvents.TABLE_STATUS_CHANGED, {
          id: order.tableId,
          status: 'FREE',
        });
      }

      return mapped;
    }

    const result = await this._ordersRepository.removeItemAndRecalculate(orderId, itemId);

    const mapped = OrdersMapper.toDomain(result);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }
}

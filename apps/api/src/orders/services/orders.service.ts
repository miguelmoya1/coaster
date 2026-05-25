import {
  AddOrderItemsDto,
  asOrderId,
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
import { BulkPayDto } from '../dto/bulk-pay.dto';
import { BulkServeDto } from '../dto/bulk-serve.dto';
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

    const order = await this._ordersRepository.createOrder(barId, dto, priceMap, totalAmount, resolvedTableName);

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

    const order = await this._ordersRepository.addItemsToOrder(
      orderId,
      additionalAmount,
      dto,
      priceMap,
      existingOrder.totalAmount,
    );

    const mapped = OrdersMapper.toDomain(order);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_ITEM_ADDED, mapped);
    return mapped;
  }

  async bulkPay(barId: BarId, orderId: OrderId, dto: BulkPayDto) {
    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const updated = await this._ordersRepository.bulkPay(orderId, dto.items);
    if (!updated) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    const mapped = OrdersMapper.toDomain(updated);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }

  async bulkServe(barId: BarId, orderId: OrderId, dto: BulkServeDto) {
    const order = await this._ordersRepository.findById(orderId);
    if (!order || order.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (order.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const updated = await this._ordersRepository.bulkServe(orderId, dto.items);
    if (!updated) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    const mapped = OrdersMapper.toDomain(updated);
    this._barGateway.server.to(barId).emit(SocketEvents.ORDER_UPDATED, mapped);
    return mapped;
  }

  async checkout(barId: BarId, orderId: OrderId) {
    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this._ordersRepository.checkoutOrder(orderId, existingOrder.tableId);

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
    const existingOrder = await this._ordersRepository.findById(orderId);
    if (!existingOrder || existingOrder.barId !== barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const order = await this._ordersRepository.cancelOrder(orderId, existingOrder.tableId);

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

    const order = await this._ordersRepository.moveTable(orderId, existingOrder.tableId, dto.tableId, newTable.name);

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

    const sourceOrdersData = sourceOrders.map((o) => ({ id: asOrderId(o.id), tableId: o.tableId }));

    const result = await this._ordersRepository.mergeOrders(
      asOrderId(primaryOrder.id),
      sourceOrdersData,
      dto.targetTableId ?? null,
      primaryOrder.tableId,
      primaryOrder.tableName,
    );

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

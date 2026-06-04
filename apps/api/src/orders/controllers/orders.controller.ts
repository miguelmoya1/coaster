import type { BarId, Order, OrderId, OrderItemId } from '@coaster/common';
import { BarPermission } from '../../core';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, Permissions, PermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import {
  CreateOrderCommand,
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CheckoutOrderCommand,
  CancelOrderCommand,
  MoveOrderTableCommand,
  MergeOrdersCommand,
  RemoveOrderItemCommand,
  DeleteOrderCommand,
} from '../commands';
import { AddOrderItemsDto } from '../dto/add-order-items.dto';
import { BulkUpdateDto } from '../dto/bulk-update.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MergeOrdersDto } from '../dto/merge-orders.dto';
import { MoveTableDto } from '../dto/move-table.dto';
import { OrdersMapper } from '../mappers/orders.mapper';
import { GetOrderByIdQuery, GetOrdersByBarIdQuery, GetOrdersByDateQuery } from '../queries';

@Controller('bars/:barId/orders')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Permissions(BarPermission.VIEW_ORDERS)
  async getOrders(@Param('barId') barId: BarId, @Query('status') status?: string, @Query('date') date?: string) {
    if (date) {
      const orders = await this._queryBus.execute<GetOrdersByDateQuery, Order[]>(new GetOrdersByDateQuery(barId, date));
      return orders.map((o) => OrdersMapper.toDto(o));
    }
    const orders = await this._queryBus.execute<GetOrdersByBarIdQuery, Order[]>(
      new GetOrdersByBarIdQuery(barId, status),
    );
    return orders.map((o) => OrdersMapper.toDto(o));
  }

  @Get(':orderId')
  @Permissions(BarPermission.VIEW_ORDERS)
  async getOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._queryBus.execute<GetOrderByIdQuery, Order>(new GetOrderByIdQuery(barId, orderId));
    return OrdersMapper.toDto(order);
  }

  @Post()
  @Permissions(BarPermission.CREATE_ORDER)
  async createOrder(@Param('barId') barId: BarId, @Body() dto: CreateOrderDto): Promise<void> {
    await this._commandBus.execute<CreateOrderCommand, void>(new CreateOrderCommand(barId, dto));
  }

  @Post(':orderId/items')
  @Permissions(BarPermission.UPDATE_ORDER)
  async addItems(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: AddOrderItemsDto,
  ): Promise<void> {
    await this._commandBus.execute<AddOrderItemsCommand, void>(new AddOrderItemsCommand(barId, orderId, dto));
  }

  @Patch(':orderId/items/bulk')
  @Permissions(BarPermission.UPDATE_ORDER)
  async bulkUpdate(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: BulkUpdateDto,
  ): Promise<void> {
    await this._commandBus.execute<BulkUpdateOrderCommand, void>(new BulkUpdateOrderCommand(barId, orderId, dto));
  }

  @Post(':orderId/checkout')
  @Permissions(BarPermission.CHECKOUT_ORDER)
  async checkout(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId): Promise<void> {
    await this._commandBus.execute<CheckoutOrderCommand, void>(new CheckoutOrderCommand(barId, orderId));
  }

  @Post(':orderId/cancel')
  @Permissions(BarPermission.CANCEL_ORDER)
  async cancelOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId): Promise<void> {
    await this._commandBus.execute<CancelOrderCommand, void>(new CancelOrderCommand(barId, orderId));
  }

  @Patch(':orderId/move-table')
  @Permissions(BarPermission.MOVE_ORDER_TABLE)
  async moveTable(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: MoveTableDto,
  ): Promise<void> {
    await this._commandBus.execute<MoveOrderTableCommand, void>(new MoveOrderTableCommand(barId, orderId, dto));
  }

  @Post('merge')
  @Permissions(BarPermission.MERGE_ORDERS)
  async mergeOrders(@Param('barId') barId: BarId, @Body() dto: MergeOrdersDto): Promise<void> {
    await this._commandBus.execute<MergeOrdersCommand, void>(new MergeOrdersCommand(barId, dto));
  }

  @Delete(':orderId/items/:itemId')
  @Permissions(BarPermission.DELETE_ORDER_ITEM)
  async removeItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ): Promise<void> {
    await this._commandBus.execute<RemoveOrderItemCommand, void>(new RemoveOrderItemCommand(barId, orderId, itemId));
  }

  @Delete(':orderId')
  @Permissions(BarPermission.DELETE_ORDER)
  async deleteOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId): Promise<void> {
    await this._commandBus.execute<DeleteOrderCommand, void>(new DeleteOrderCommand(barId, orderId));
  }
}

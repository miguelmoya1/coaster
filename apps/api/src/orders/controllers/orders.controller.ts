import { type BarId, BarRole, type Order, type OrderId, type OrderItemId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { AddOrderItemsDto } from '../dto/add-order-items.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MergeOrdersDto } from '../dto/merge-orders.dto';
import { MoveTableDto } from '../dto/move-table.dto';
import { BulkUpdateDto } from '../dto/bulk-update.dto';
import { OrdersMapper } from '../mappers/orders.mapper';
import { GetOrderByIdQuery, GetOrdersByBarIdQuery, GetOrdersByDateQuery } from '../queries';
import {
  CreateOrderCommand,
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CheckoutOrderCommand,
  CancelOrderCommand,
  MoveOrderTableCommand,
  MergeOrdersCommand,
  RemoveOrderItemCommand,
  DeleteOrderCommand
} from '../commands';

@Controller('bars/:barId/orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getOrders(
    @Param('barId') barId: BarId,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    if (date) {
      const orders = await this._queryBus.execute<GetOrdersByDateQuery, Order[]>(new GetOrdersByDateQuery(barId, date));
      return orders.map((o) => OrdersMapper.toDto(o));
    }
    const orders = await this._queryBus.execute<GetOrdersByBarIdQuery, Order[]>(new GetOrdersByBarIdQuery(barId, status));
    return orders.map((o) => OrdersMapper.toDto(o));
  }

  @Get(':orderId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._queryBus.execute<GetOrderByIdQuery, Order>(new GetOrderByIdQuery(barId, orderId));
    return OrdersMapper.toDto(order);
  }

  @Post()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async createOrder(@Param('barId') barId: BarId, @Body() dto: CreateOrderDto) {
    const order = await this._commandBus.execute<CreateOrderCommand, Order>(new CreateOrderCommand(barId, dto));
    return { id: order.id };
  }

  @Post(':orderId/items')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async addItems(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: AddOrderItemsDto) {
    const order = await this._commandBus.execute<AddOrderItemsCommand, Order>(new AddOrderItemsCommand(barId, orderId, dto));
    return OrdersMapper.toDto(order);
  }

  @Patch(':orderId/items/bulk')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async bulkUpdate(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: BulkUpdateDto,
  ) {
    const order = await this._commandBus.execute<BulkUpdateOrderCommand, Order>(new BulkUpdateOrderCommand(barId, orderId, dto));
    return OrdersMapper.toDto(order);
  }

  @Post(':orderId/checkout')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async checkout(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._commandBus.execute<CheckoutOrderCommand, Order>(new CheckoutOrderCommand(barId, orderId));
    return OrdersMapper.toDto(order);
  }

  @Post(':orderId/cancel')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async cancelOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._commandBus.execute<CancelOrderCommand, Order>(new CancelOrderCommand(barId, orderId));
    return OrdersMapper.toDto(order);
  }

  @Patch(':orderId/move-table')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async moveTable(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: MoveTableDto) {
    const order = await this._commandBus.execute<MoveOrderTableCommand, Order>(new MoveOrderTableCommand(barId, orderId, dto));
    return OrdersMapper.toDto(order);
  }

  @Post('merge')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async mergeOrders(@Param('barId') barId: BarId, @Body() dto: MergeOrdersDto) {
    const order = await this._commandBus.execute<MergeOrdersCommand, Order>(new MergeOrdersCommand(barId, dto));
    return OrdersMapper.toDto(order);
  }

  @Delete(':orderId/items/:itemId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async removeItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ) {
    const order = await this._commandBus.execute<RemoveOrderItemCommand, Order>(new RemoveOrderItemCommand(barId, orderId, itemId));
    return OrdersMapper.toDto(order);
  }

  @Delete(':orderId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async deleteOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    await this._commandBus.execute<DeleteOrderCommand, void>(new DeleteOrderCommand(barId, orderId));
    return commonMapper.getSuccessResponse();
  }
}

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
      const orders = await this._queryBus.execute(new GetOrdersByDateQuery(barId, date)) as Order[];
      return orders.map((o) => OrdersMapper.toDto(o));
    }
    const orders = await this._queryBus.execute(new GetOrdersByBarIdQuery(barId, status)) as Order[];
    return orders.map((o) => OrdersMapper.toDto(o));
  }

  @Get(':orderId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._queryBus.execute(new GetOrderByIdQuery(barId, orderId)) as Order;
    return OrdersMapper.toDto(order);
  }

  @Post()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async createOrder(@Param('barId') barId: BarId, @Body() dto: CreateOrderDto) {
    const order = await this._commandBus.execute(new CreateOrderCommand(barId, dto)) as Order;
    return { id: order.id };
  }

  @Post(':orderId/items')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async addItems(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: AddOrderItemsDto) {
    await this._commandBus.execute(new AddOrderItemsCommand(barId, orderId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Patch(':orderId/bulk-update')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async bulkUpdate(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: BulkUpdateDto,
  ) {
    await this._commandBus.execute(new BulkUpdateOrderCommand(barId, orderId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Post(':orderId/checkout')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async checkout(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    await this._commandBus.execute(new CheckoutOrderCommand(barId, orderId));
    return commonMapper.getSuccessResponse();
  }

  @Post(':orderId/cancel')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async cancelOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    await this._commandBus.execute(new CancelOrderCommand(barId, orderId));
    return commonMapper.getSuccessResponse();
  }

  @Post(':orderId/move')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async moveTable(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: MoveTableDto) {
    await this._commandBus.execute(new MoveOrderTableCommand(barId, orderId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Post('merge')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async mergeOrders(@Param('barId') barId: BarId, @Body() dto: MergeOrdersDto) {
    await this._commandBus.execute(new MergeOrdersCommand(barId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':orderId/items/:itemId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async removeItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ) {
    await this._commandBus.execute(new RemoveOrderItemCommand(barId, orderId, itemId));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':orderId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async deleteOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    await this._commandBus.execute(new DeleteOrderCommand(barId, orderId));
    return commonMapper.getSuccessResponse();
  }
}

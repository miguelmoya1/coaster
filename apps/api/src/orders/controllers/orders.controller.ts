import { type BarId, BarRole, type OrderId, type OrderItemId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { AddOrderItemsDto } from '../dto/add-order-items.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MergeOrdersDto } from '../dto/merge-orders.dto';
import { MoveTableDto } from '../dto/move-table.dto';
import { OrdersMapper } from '../mappers/orders.mapper';
import { OrdersService } from '../services/orders.service';

@Controller('bars/:barId/orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly _ordersService: OrdersService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getOrders(@Param('barId') barId: BarId, @Query('status') status?: string, @Query('date') date?: string) {
    if (date) {
      const orders = await this._ordersService.getOrdersByDate(barId, date);
      return orders.map((o) => OrdersMapper.toDto(o));
    }
    const orders = await this._ordersService.getOrdersByBarId(barId, status);
    return orders.map((o) => OrdersMapper.toDto(o));
  }

  @Get(':orderId')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._ordersService.getOrderById(barId, orderId);
    return OrdersMapper.toDto(order);
  }

  @Post()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async createOrder(@Param('barId') barId: BarId, @Body() dto: CreateOrderDto) {
    const order = await this._ordersService.createOrder(barId, dto);
    return OrdersMapper.toDto(order);
  }

  @Post(':orderId/items')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async addItems(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: AddOrderItemsDto) {
    const order = await this._ordersService.addItems(barId, orderId, dto);
    return OrdersMapper.toDto(order);
  }

  @Patch(':orderId/items/:itemId/pay')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async payItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ) {
    const order = await this._ordersService.payItem(barId, orderId, itemId);
    return OrdersMapper.toDto(order);
  }

  @Patch(':orderId/items/:itemId/deliver')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async deliverItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ) {
    const order = await this._ordersService.deliverItem(barId, orderId, itemId);
    return OrdersMapper.toDto(order);
  }

  @Post(':orderId/checkout')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async checkout(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._ordersService.checkout(barId, orderId);
    return OrdersMapper.toDto(order);
  }

  @Post(':orderId/cancel')
  @Roles(BarRole.OWNER)
  async cancelOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._ordersService.cancelOrder(barId, orderId);
    return OrdersMapper.toDto(order);
  }

  @Patch(':orderId/move-table')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async moveTable(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId, @Body() dto: MoveTableDto) {
    const order = await this._ordersService.moveTable(barId, orderId, dto);
    return OrdersMapper.toDto(order);
  }

  @Post('merge')
  @Roles(BarRole.OWNER)
  async mergeOrders(@Param('barId') barId: BarId, @Body() dto: MergeOrdersDto) {
    const order = await this._ordersService.mergeOrders(barId, dto);
    return OrdersMapper.toDto(order);
  }

  @Delete(':orderId')
  @Roles(BarRole.OWNER)
  async deleteOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    return this._ordersService.deleteOrder(barId, orderId);
  }
}

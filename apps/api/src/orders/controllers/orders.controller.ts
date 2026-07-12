import type { BarId, Order, OrderId, OrderItemId } from '@coaster/common';
import { BarPermission, OrderStatus } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard } from '../../core';
import {
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CancelOrderCommand,
  CheckoutOrderCommand,
  CreateOrderCommand,
  DeleteOrderCommand,
  MergeOrdersCommand,
  MoveOrderTableCommand,
  RemoveOrderItemCommand,
  UpdateOrderTipCommand,
  AddOrderAdjustmentCommand,
  RemoveOrderAdjustmentCommand,
} from '../commands';
import { AddOrderItemsDto } from '../dto/add-order-items.dto';
import { BulkUpdateDto } from '../dto/bulk-update.dto';
import { CheckoutOrderDto } from '../dto/checkout-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MergeOrdersDto } from '../dto/merge-orders.dto';
import { MoveTableDto } from '../dto/move-table.dto';
import { UpdateOrderTipDto } from '../dto/update-order-tip.dto';
import { AddOrderAdjustmentDto } from '../dto/add-order-adjustment.dto';
import { OrdersMapper } from '../mappers/orders.mapper';
import { GetOrderByIdQuery, GetOrdersByBarIdQuery, GetOrdersByDateQuery } from '../queries';

@Controller('bars/:barId/orders')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class OrdersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_ORDERS)
  async getOrders(@Param('barId') barId: BarId, @Query('status') status?: OrderStatus, @Query('date') date?: string) {
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
  @BarPermissions(BarPermission.BAR_VIEW_ORDERS)
  async getOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId) {
    const order = await this._queryBus.execute<GetOrderByIdQuery, Order>(new GetOrderByIdQuery(barId, orderId));
    return OrdersMapper.toDto(order);
  }

  @Post()
  @BarPermissions(BarPermission.BAR_CREATE_ORDER)
  async createOrder(@Param('barId') barId: BarId, @Body() dto: CreateOrderDto): Promise<void> {
    await this._commandBus.execute<CreateOrderCommand, void>(new CreateOrderCommand(barId, dto));
  }

  @Post(':orderId/items')
  @BarPermissions(BarPermission.BAR_UPDATE_ORDER)
  async addItems(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: AddOrderItemsDto,
  ): Promise<void> {
    await this._commandBus.execute<AddOrderItemsCommand, void>(new AddOrderItemsCommand(barId, orderId, dto));
  }

  @Patch(':orderId/items/bulk')
  @BarPermissions(BarPermission.BAR_UPDATE_ORDER)
  async bulkUpdate(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: BulkUpdateDto,
  ): Promise<void> {
    await this._commandBus.execute<BulkUpdateOrderCommand, void>(new BulkUpdateOrderCommand(barId, orderId, dto));
  }

  @Post(':orderId/checkout')
  @BarPermissions(BarPermission.BAR_CHECKOUT_ORDER)
  async checkout(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: CheckoutOrderDto,
  ): Promise<void> {
    await this._commandBus.execute<CheckoutOrderCommand, void>(
      new CheckoutOrderCommand(barId, orderId, dto.paymentMethod),
    );
  }

  @Post(':orderId/cancel')
  @BarPermissions(BarPermission.BAR_CANCEL_ORDER)
  async cancelOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId): Promise<void> {
    await this._commandBus.execute<CancelOrderCommand, void>(new CancelOrderCommand(barId, orderId));
  }

  @Patch(':orderId/move-table')
  @BarPermissions(BarPermission.BAR_MOVE_ORDER_TABLE)
  async moveTable(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: MoveTableDto,
  ): Promise<void> {
    await this._commandBus.execute<MoveOrderTableCommand, void>(new MoveOrderTableCommand(barId, orderId, dto));
  }

  @Post('merge')
  @BarPermissions(BarPermission.BAR_MERGE_ORDERS)
  async mergeOrders(@Param('barId') barId: BarId, @Body() dto: MergeOrdersDto): Promise<void> {
    await this._commandBus.execute<MergeOrdersCommand, void>(new MergeOrdersCommand(barId, dto));
  }

  @Delete(':orderId/items/:itemId')
  @BarPermissions(BarPermission.BAR_DELETE_ORDER_ITEM)
  async removeItem(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ): Promise<void> {
    await this._commandBus.execute<RemoveOrderItemCommand, void>(new RemoveOrderItemCommand(barId, orderId, itemId));
  }

  @Delete(':orderId')
  @BarPermissions(BarPermission.BAR_DELETE_ORDER)
  async deleteOrder(@Param('barId') barId: BarId, @Param('orderId') orderId: OrderId): Promise<void> {
    await this._commandBus.execute<DeleteOrderCommand, void>(new DeleteOrderCommand(barId, orderId));
  }

  @Patch(':orderId/tip')
  @BarPermissions(BarPermission.BAR_UPDATE_ORDER)
  async updateOrderTip(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: UpdateOrderTipDto,
  ): Promise<void> {
    await this._commandBus.execute<UpdateOrderTipCommand, void>(new UpdateOrderTipCommand(barId, orderId, dto));
  }

  @Post(':orderId/adjustments')
  @BarPermissions(BarPermission.BAR_UPDATE_ORDER)
  async addOrderAdjustment(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: AddOrderAdjustmentDto,
  ): Promise<void> {
    await this._commandBus.execute<AddOrderAdjustmentCommand, void>(new AddOrderAdjustmentCommand(barId, orderId, dto));
  }

  @Delete(':orderId/adjustments/:adjustmentId')
  @BarPermissions(BarPermission.BAR_UPDATE_ORDER)
  async removeOrderAdjustment(
    @Param('barId') barId: BarId,
    @Param('orderId') orderId: OrderId,
    @Param('adjustmentId') adjustmentId: string,
  ): Promise<void> {
    await this._commandBus.execute<RemoveOrderAdjustmentCommand, void>(
      new RemoveOrderAdjustmentCommand(barId, orderId, adjustmentId as any),
    );
  }
}


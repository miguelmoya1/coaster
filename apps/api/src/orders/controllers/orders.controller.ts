import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, Order, OrderAdjustmentId, OrderId, OrderItemId } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission, OrderStatus } from '@coaster/common';
import {
  EstablishmentModulesGuard,
  EstablishmentPermissions,
  EstablishmentPermissionsGuard,
  RequiresModule,
} from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  AddOrderAdjustmentCommand,
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CancelOrderCommand,
  CheckoutOrderCommand,
  CreateOrderCommand,
  DeleteOrderCommand,
  MergeOrdersCommand,
  MoveOrderTableCommand,
  RemoveOrderAdjustmentCommand,
  RemoveOrderItemCommand,
  UpdateOrderTipCommand,
} from '../commands';
import { AddOrderAdjustmentDto } from '../dto/add-order-adjustment.dto';
import { AddOrderItemsDto } from '../dto/add-order-items.dto';
import { BulkUpdateDto } from '../dto/bulk-update.dto';
import { CheckoutOrderDto } from '../dto/checkout-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { MergeOrdersDto } from '../dto/merge-orders.dto';
import { MoveTableDto } from '../dto/move-table.dto';
import { UpdateOrderTipDto } from '../dto/update-order-tip.dto';
import { OrdersMapper } from '../mappers/orders.mapper';
import { GetOrderByIdQuery, GetOrdersByEstablishmentIdQuery, GetOrdersByDateQuery } from '../queries';

@Controller('establishments/:establishmentId/orders')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard, EstablishmentModulesGuard)
@RequiresModule(EstablishmentModule.ORDERS)
export class OrdersController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS)
  async getOrders(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Query('status') status?: OrderStatus,
    @Query('date') date?: string,
  ) {
    if (date) {
      const orders = await this._queryBus.execute<GetOrdersByDateQuery, Order[]>(
        new GetOrdersByDateQuery(establishmentId, date),
      );
      return orders.map((o) => OrdersMapper.toDto(o));
    }
    const orders = await this._queryBus.execute<GetOrdersByEstablishmentIdQuery, Order[]>(
      new GetOrdersByEstablishmentIdQuery(establishmentId, status),
    );
    return orders.map((o) => OrdersMapper.toDto(o));
  }

  @Get(':orderId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS)
  async getOrder(@Param('establishmentId') establishmentId: EstablishmentId, @Param('orderId') orderId: OrderId) {
    const order = await this._queryBus.execute<GetOrderByIdQuery, Order>(
      new GetOrderByIdQuery(establishmentId, orderId),
    );
    return OrdersMapper.toDto(order);
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_ORDER)
  async createOrder(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateOrderDto,
  ): Promise<void> {
    await this._commandBus.execute<CreateOrderCommand, void>(new CreateOrderCommand(establishmentId, dto));
  }

  @Post(':orderId/items')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_ORDER)
  async addItems(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: AddOrderItemsDto,
  ): Promise<void> {
    await this._commandBus.execute<AddOrderItemsCommand, void>(new AddOrderItemsCommand(establishmentId, orderId, dto));
  }

  @Patch(':orderId/items/bulk')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_ORDER)
  async bulkUpdate(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: BulkUpdateDto,
  ): Promise<void> {
    await this._commandBus.execute<BulkUpdateOrderCommand, void>(
      new BulkUpdateOrderCommand(establishmentId, orderId, dto),
    );
  }

  @Post(':orderId/checkout')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CHECKOUT_ORDER)
  async checkout(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: CheckoutOrderDto,
  ): Promise<void> {
    await this._commandBus.execute<CheckoutOrderCommand, void>(
      new CheckoutOrderCommand(establishmentId, orderId, dto.paymentMethod),
    );
  }

  @Post(':orderId/cancel')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CANCEL_ORDER)
  async cancelOrder(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
  ): Promise<void> {
    await this._commandBus.execute<CancelOrderCommand, void>(new CancelOrderCommand(establishmentId, orderId));
  }

  @Patch(':orderId/move-table')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MOVE_ORDER_TABLE)
  async moveTable(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: MoveTableDto,
  ): Promise<void> {
    await this._commandBus.execute<MoveOrderTableCommand, void>(
      new MoveOrderTableCommand(establishmentId, orderId, dto),
    );
  }

  @Post('merge')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MERGE_ORDERS)
  async mergeOrders(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: MergeOrdersDto,
  ): Promise<void> {
    await this._commandBus.execute<MergeOrdersCommand, void>(new MergeOrdersCommand(establishmentId, dto));
  }

  @Delete(':orderId/items/:itemId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_ORDER_ITEM)
  async removeItem(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Param('itemId') itemId: OrderItemId,
  ): Promise<void> {
    await this._commandBus.execute<RemoveOrderItemCommand, void>(
      new RemoveOrderItemCommand(establishmentId, orderId, itemId),
    );
  }

  @Delete(':orderId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_ORDER)
  async deleteOrder(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
  ): Promise<void> {
    await this._commandBus.execute<DeleteOrderCommand, void>(new DeleteOrderCommand(establishmentId, orderId));
  }

  @Patch(':orderId/tip')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_ORDER)
  async updateOrderTip(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: UpdateOrderTipDto,
  ): Promise<void> {
    await this._commandBus.execute<UpdateOrderTipCommand, void>(
      new UpdateOrderTipCommand(establishmentId, orderId, dto),
    );
  }

  @Post(':orderId/adjustments')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_ORDER)
  async addOrderAdjustment(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Body() dto: AddOrderAdjustmentDto,
  ): Promise<void> {
    await this._commandBus.execute<AddOrderAdjustmentCommand, void>(
      new AddOrderAdjustmentCommand(establishmentId, orderId, dto),
    );
  }

  @Delete(':orderId/adjustments/:adjustmentId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_ORDER)
  async removeOrderAdjustment(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('orderId') orderId: OrderId,
    @Param('adjustmentId') adjustmentId: string,
  ): Promise<void> {
    await this._commandBus.execute<RemoveOrderAdjustmentCommand, void>(
      new RemoveOrderAdjustmentCommand(establishmentId, orderId, adjustmentId as OrderAdjustmentId),
    );
  }
}

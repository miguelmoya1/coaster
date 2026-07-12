import { inject, Service } from '@angular/core';
import type {
  AddOrderItemsDto,
  BarId,
  BulkUpdateDto,
  CheckoutOrderDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  OrderId,
  OrderItemId,
  UpdateOrderTipDto,
  AddOrderAdjustmentDto,
} from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class ManageOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.getOrder(barId, orderId);
  }

  public async create(barId: BarId, dto: CreateOrderDto): Promise<void> {
    await this.#orderRepository.create(barId, dto);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    await this.#orderRepository.addItems(barId, orderId, dto);
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    await this.#orderRepository.bulkUpdate(barId, orderId, dto);
  }

  public async checkout(barId: BarId, orderId: OrderId, dto: CheckoutOrderDto): Promise<void> {
    await this.#orderRepository.checkout(barId, orderId, dto);
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    await this.#orderRepository.cancel(barId, orderId);
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    await this.#orderRepository.moveTable(barId, orderId, dto);
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    await this.#orderRepository.merge(barId, dto);
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    await this.#orderRepository.removeItem(barId, orderId, itemId);
  }

  public async updateTip(barId: BarId, orderId: OrderId, dto: UpdateOrderTipDto): Promise<void> {
    await this.#orderRepository.updateTip(barId, orderId, dto);
  }

  public async addAdjustment(barId: BarId, orderId: OrderId, dto: AddOrderAdjustmentDto): Promise<void> {
    await this.#orderRepository.addAdjustment(barId, orderId, dto);
  }

  public async removeAdjustment(barId: BarId, orderId: OrderId, adjustmentId: string): Promise<void> {
    await this.#orderRepository.removeAdjustment(barId, orderId, adjustmentId);
  }
}

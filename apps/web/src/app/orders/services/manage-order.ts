import { inject, Service } from '@angular/core';
import type {
  AddOrderItemsDto,
  EstablishmentId,
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

  public async getOrder(establishmentId: EstablishmentId, orderId: OrderId) {
    return await this.#orderRepository.getOrder(establishmentId, orderId);
  }

  public async create(establishmentId: EstablishmentId, dto: CreateOrderDto): Promise<void> {
    await this.#orderRepository.create(establishmentId, dto);
  }

  public async addItems(establishmentId: EstablishmentId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    await this.#orderRepository.addItems(establishmentId, orderId, dto);
  }

  public async bulkUpdate(establishmentId: EstablishmentId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    await this.#orderRepository.bulkUpdate(establishmentId, orderId, dto);
  }

  public async checkout(establishmentId: EstablishmentId, orderId: OrderId, dto: CheckoutOrderDto): Promise<void> {
    await this.#orderRepository.checkout(establishmentId, orderId, dto);
  }

  public async cancel(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    await this.#orderRepository.cancel(establishmentId, orderId);
  }

  public async moveTable(establishmentId: EstablishmentId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    await this.#orderRepository.moveTable(establishmentId, orderId, dto);
  }

  public async merge(establishmentId: EstablishmentId, dto: MergeOrdersDto): Promise<void> {
    await this.#orderRepository.merge(establishmentId, dto);
  }

  public async removeItem(establishmentId: EstablishmentId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    await this.#orderRepository.removeItem(establishmentId, orderId, itemId);
  }

  public async updateTip(establishmentId: EstablishmentId, orderId: OrderId, dto: UpdateOrderTipDto): Promise<void> {
    await this.#orderRepository.updateTip(establishmentId, orderId, dto);
  }

  public async addAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    dto: AddOrderAdjustmentDto,
  ): Promise<void> {
    await this.#orderRepository.addAdjustment(establishmentId, orderId, dto);
  }

  public async removeAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    adjustmentId: string,
  ): Promise<void> {
    await this.#orderRepository.removeAdjustment(establishmentId, orderId, adjustmentId);
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AddOrderItemsDto,
  EstablishmentId,
  BulkUpdateDto,
  CheckoutOrderDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  Order,
  OrderId,
  OrderItemId,
  UpdateOrderTipDto,
  AddOrderAdjustmentDto,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { orderMapper } from '../mappers/order.mapper';

@Service()
export class OrderRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/orders`,
    listByStatus: (establishmentId: EstablishmentId, status: string) =>
      `/establishments/${establishmentId}/orders?status=${status}`,
    listByDate: (establishmentId: EstablishmentId, date: string) =>
      `/establishments/${establishmentId}/orders?date=${date}`,
    get: (establishmentId: EstablishmentId, orderId: OrderId) => `/establishments/${establishmentId}/orders/${orderId}`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/orders`,
    delete: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}`,
    addItems: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/items`,
    bulkUpdate: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/items/bulk`,
    checkout: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/checkout`,
    cancel: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/cancel`,
    moveTable: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/move-table`,
    merge: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/orders/merge`,
    removeItem: (establishmentId: EstablishmentId, orderId: OrderId, itemId: OrderItemId) =>
      `/establishments/${establishmentId}/orders/${orderId}/items/${itemId}`,
    updateTip: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/tip`,
    addAdjustment: (establishmentId: EstablishmentId, orderId: OrderId) =>
      `/establishments/${establishmentId}/orders/${orderId}/adjustments`,
    removeAdjustment: (establishmentId: EstablishmentId, orderId: OrderId, adjustmentId: string) =>
      `/establishments/${establishmentId}/orders/${orderId}/adjustments/${adjustmentId}`,
  };

  public async getOrder(establishmentId: EstablishmentId, orderId: OrderId) {
    return firstValueFrom(
      this.#http.get<Order>(this.routes.get(establishmentId, orderId)).pipe(map((order) => orderMapper(order))),
    );
  }

  public async create(establishmentId: EstablishmentId, dto: CreateOrderDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(establishmentId), dto));
  }

  public async addItems(establishmentId: EstablishmentId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.addItems(establishmentId, orderId), dto));
  }

  public async bulkUpdate(establishmentId: EstablishmentId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.bulkUpdate(establishmentId, orderId), dto));
  }

  public async checkout(establishmentId: EstablishmentId, orderId: OrderId, dto: CheckoutOrderDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.checkout(establishmentId, orderId), dto));
  }

  public async cancel(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.cancel(establishmentId, orderId), {}));
  }

  public async moveTable(establishmentId: EstablishmentId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.moveTable(establishmentId, orderId), dto));
  }

  public async merge(establishmentId: EstablishmentId, dto: MergeOrdersDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.merge(establishmentId), dto));
  }

  public async removeItem(establishmentId: EstablishmentId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.removeItem(establishmentId, orderId, itemId)));
  }

  public async deleteOrder(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.delete(establishmentId, orderId)));
  }

  public async updateTip(establishmentId: EstablishmentId, orderId: OrderId, dto: UpdateOrderTipDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.updateTip(establishmentId, orderId), dto));
  }

  public async addAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    dto: AddOrderAdjustmentDto,
  ): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.addAdjustment(establishmentId, orderId), dto));
  }

  public async removeAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    adjustmentId: string,
  ): Promise<void> {
    return firstValueFrom(
      this.#http.delete<void>(this.routes.removeAdjustment(establishmentId, orderId, adjustmentId)),
    );
  }
}

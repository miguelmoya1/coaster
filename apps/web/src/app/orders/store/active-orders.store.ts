import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type {
  AddOrderItemsDto,
  BarId,
  BulkUpdateDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  Order,
  OrderId,
  OrderItemId,
} from '@coaster/common';
import { OrderStatus, PaymentMethod } from '@coaster/common';
import { Socket, Toast } from '@coaster/core';
import { orderArrayMapper } from '../mappers/order.mapper';
import { BarOrders } from '../services/bar-orders';
import { CreateOrder } from '../services/create-order';
import { DeleteOrder } from '../services/delete-order';
import { ManageOrder } from '../services/manage-order';
import { PrintOrder } from '../services/print-order';

@Service()
export class ActiveOrdersStore {
  readonly #barOrders = inject(BarOrders);
  readonly #createOrder = inject(CreateOrder);
  readonly #deleteOrder = inject(DeleteOrder);
  readonly #manageOrder = inject(ManageOrder);
  readonly #printOrder = inject(PrintOrder);
  readonly #socketService = inject(Socket);
  readonly #toastService = inject(Toast);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #ordersResource = httpResource(() => this.#barOrders.execute(this.#currentBarId(), OrderStatus.OPEN), {
    parse: (orders) => orderArrayMapper(orders),
  });

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly list = this.#ordersResource.asReadonly();

  public readonly openOrders = computed(() => {
    if (this.#ordersResource.hasValue()) {
      return this.#ordersResource.value()?.filter((o) => o.status === OrderStatus.OPEN) ?? [];
    }
    return [];
  });

  public readonly totalOpen = computed(() => this.openOrders().length);

  constructor() {
    // Shared helper for upserting an order on socket events
    const upsertOrder = (order: Order) => {
      this.#ordersResource.update((orders) => {
        if (!orders) return [order];
        const exists = orders.some((o) => o.id === order.id);
        return exists ? orders.map((o) => (o.id === order.id ? order : o)) : [...orders, order];
      });
    };

    // Order created
    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#currentBarId() === created.barId) {
        upsertOrder(created);
      }
    });

    // Order updated
    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#currentBarId() === updated.barId) {
        upsertOrder(updated);
      }
    });

    // Order closed
    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentBarId() === closed.barId) {
        upsertOrder(closed);
      }
    });

    // Order cancelled
    effect(() => {
      const cancelled = this.#socketService.orderCancelled();
      if (cancelled) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });

    // Order item added
    effect(() => {
      const itemAdded = this.#socketService.orderItemAdded();
      if (itemAdded && this.#currentBarId() === itemAdded.barId) {
        upsertOrder(itemAdded);
      }
    });

    // Order deleted
    effect(() => {
      const deleted = this.#socketService.orderDeleted();
      if (deleted) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.filter((o) => o.id !== deleted.id);
        });
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadOrders() {
    this.#ordersResource.reload();
  }

  public optimisticUpdate(orderId: OrderId, updater: (order: Order) => Order): Order | undefined {
    let original: Order | undefined;
    this.#ordersResource.update((orders) => {
      if (!orders) return undefined;
      return orders.map((o) => {
        if (o.id === orderId) {
          original = { ...o };
          return updater(o);
        }
        return o;
      });
    });
    return original;
  }

  public revertUpdate(originalOrder: Order | undefined) {
    if (!originalOrder) return;
    this.#ordersResource.update((orders) => {
      if (!orders) return undefined;
      return orders.map((o) => (o.id === originalOrder.id ? originalOrder : o));
    });
  }

  // --- Actions ---

  public async create(barId: BarId, dto: CreateOrderDto) {
    try {
      await this.#createOrder.execute(barId, dto);
      return { error: null };
    } catch (error) {
      return { error: this.#extractErrorMessage(error, 'ERR_CREATE_ORDER') };
    }
  }

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#manageOrder.getOrder(barId, orderId);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    try {
      await this.#manageOrder.addItems(barId, orderId, dto);
    } catch (e) {
      this.#toastService.error(this.#extractErrorMessage(e, 'ERR_ADD_ITEMS'));
      throw e;
    }
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    try {
      await this.#manageOrder.bulkUpdate(barId, orderId, dto);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_PAYMENT'));
      throw error;
    }
  }

  public async checkout(barId: BarId, orderId: OrderId, paymentMethod: PaymentMethod): Promise<void> {
    try {
      await this.#manageOrder.checkout(barId, orderId, { paymentMethod });
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_CHECKOUT'));
      throw error;
    }
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    try {
      await this.#manageOrder.cancel(barId, orderId);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_CANCEL_ORDER'));
      throw error;
    }
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    try {
      await this.#manageOrder.moveTable(barId, orderId, dto);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_MOVE_TABLE'));
      throw error;
    }
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    try {
      await this.#manageOrder.merge(barId, dto);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_MERGE_TABLES'));
      throw error;
    }
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    try {
      await this.#manageOrder.removeItem(barId, orderId, itemId);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_REMOVE_ITEM'));
      throw error;
    }
  }

  public async deleteOrder(barId: BarId, orderId: OrderId): Promise<void> {
    try {
      await this.#deleteOrder.execute(barId, orderId);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_DELETE_ORDER'));
      throw error;
    }
  }

  public async printOrder(order: Order): Promise<void> {
    try {
      await this.#printOrder.execute(order);
    } catch (error) {
      this.#toastService.error(this.#extractErrorMessage(error, 'ERR_PRINT_ORDER'));
      throw error;
    }
  }

  #extractErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const errObj = error as Record<string, unknown>;
      // For some cases where error has an inner `error` object (e.g. HttpErrorResponse)
      const innerError = errObj['error'] as Record<string, unknown> | undefined;
      if (innerError?.['message']) {
        return String(innerError['message']);
      } else if (errObj['message']) {
        return String(errObj['message']);
      }
    }
    return fallback;
  }
}

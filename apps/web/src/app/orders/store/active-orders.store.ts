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
import { Socket } from '@coaster/core';
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

    // Order tip updated
    effect(() => {
      const tipUpdated = this.#socketService.orderTipUpdated();
      if (tipUpdated) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => {
            if (o.id === tipUpdated.orderId) {
              const orderTotal = o.orderTotal ?? o.totalAmount;
              return {
                ...o,
                tipAmount: tipUpdated.tipAmount,
                payableTotal: orderTotal + tipUpdated.tipAmount,
              };
            }
            return o;
          });
        });
      }
    });

    // Order adjustments updated
    effect(() => {
      const adjUpdated = this.#socketService.orderAdjustmentsUpdated();
      if (adjUpdated) {
        // Since adjustments recalculate total, we actually want to fetch the updated order from the backend.
        // Let's reload the whole store or a specific order. The easiest is calling getOrder and upserting.
        // But since we are in an effect and we can't await cleanly without messy code, let's just trigger a reload of all orders,
        // OR better yet, recalculate optimistically.
        // Even better, trigger a fetch for the specific order.
        const orderId = adjUpdated.orderId as OrderId;
        const currentBarId = this.#currentBarId();
        if (currentBarId) {
          this.getOrder(currentBarId, orderId).then((updatedOrder) => {
             upsertOrder(updatedOrder);
          });
        }
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
    await this.#createOrder.execute(barId, dto);
  }

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#manageOrder.getOrder(barId, orderId);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    await this.#manageOrder.addItems(barId, orderId, dto);
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    await this.#manageOrder.bulkUpdate(barId, orderId, dto);
  }

  public async checkout(barId: BarId, orderId: OrderId, paymentMethod: PaymentMethod): Promise<void> {
    await this.#manageOrder.checkout(barId, orderId, { paymentMethod });
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    await this.#manageOrder.cancel(barId, orderId);
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    await this.#manageOrder.moveTable(barId, orderId, dto);
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    await this.#manageOrder.merge(barId, dto);
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    await this.#manageOrder.removeItem(barId, orderId, itemId);
  }

  public async deleteOrder(barId: BarId, orderId: OrderId): Promise<void> {
    await this.#deleteOrder.execute(barId, orderId);
  }

  public async printOrder(order: Order): Promise<void> {
    await this.#printOrder.execute(order);
  }

  public async updateTip(barId: BarId, orderId: OrderId, tipAmount: number): Promise<void> {
    // Optimistic update
    const original = this.optimisticUpdate(orderId, (o) => ({
      ...o,
      tipAmount,
      payableTotal: (o.orderTotal ?? o.totalAmount) + tipAmount,
    }));
    try {
      await this.#manageOrder.updateTip(barId, orderId, { tipAmount });
    } catch (e) {
      this.revertUpdate(original);
      throw e;
    }
  }

  public async addAdjustment(barId: BarId, orderId: OrderId, dto: any): Promise<void> {
    await this.#manageOrder.addAdjustment(barId, orderId, dto);
  }

  public async removeAdjustment(barId: BarId, orderId: OrderId, adjustmentId: string): Promise<void> {
    await this.#manageOrder.removeAdjustment(barId, orderId, adjustmentId);
  }
}


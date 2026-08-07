import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type {
  AddOrderAdjustmentDto,
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

@Service()
export class ActiveOrdersStore {
  readonly #barOrders = inject(BarOrders);
  readonly #createOrder = inject(CreateOrder);
  readonly #deleteOrder = inject(DeleteOrder);
  readonly #manageOrder = inject(ManageOrder);
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
    const upsertOrder = (order: Order) => {
      this.#ordersResource.update((orders) => {
        if (!orders) return [order];
        const exists = orders.some((o) => o.id === order.id);
        return exists ? orders.map((o) => (o.id === order.id ? order : o)) : [...orders, order];
      });
    };

    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#currentBarId() === created.barId) {
        upsertOrder(created);
      }
    });

    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#currentBarId() === updated.barId) {
        upsertOrder(updated);
      }
    });

    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentBarId() === closed.barId) {
        upsertOrder(closed);
      }
    });

    effect(() => {
      const cancelled = this.#socketService.orderCancelled();
      if (cancelled) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });

    effect(() => {
      const itemAdded = this.#socketService.orderItemAdded();
      if (itemAdded && this.#currentBarId() === itemAdded.barId) {
        upsertOrder(itemAdded);
      }
    });

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

    effect(() => {
      const adjUpdated = this.#socketService.orderAdjustmentsUpdated();
      if (adjUpdated) {
        const orderId = adjUpdated.orderId as OrderId;
        const currentBarId = this.#currentBarId();
        if (currentBarId) {
          this.getOrder(currentBarId, orderId).then((updatedOrder) => {
            upsertOrder(updatedOrder);
          });
        }
      }
    });

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

  public async updateTip(barId: BarId, orderId: OrderId, tipAmount: number): Promise<void> {
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

  public async addAdjustment(barId: BarId, orderId: OrderId, dto: AddOrderAdjustmentDto): Promise<void> {
    await this.#manageOrder.addAdjustment(barId, orderId, dto);
  }

  public async removeAdjustment(barId: BarId, orderId: OrderId, adjustmentId: string): Promise<void> {
    await this.#manageOrder.removeAdjustment(barId, orderId, adjustmentId);
  }
}

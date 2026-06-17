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
  PaymentMethod,
} from '@coaster/common';
import { handleErrorFormField, OrderStatus, Socket, Toast } from '@coaster/core';
import { orderArrayMapper } from '../mappers/order.mapper';
import { BarOrderHistory } from '../services/bar-order-history';
import { BarOrders } from '../services/bar-orders';
import { CreateOrder } from '../services/create-order';
import { DeleteOrder } from '../services/delete-order';
import { ManageOrder } from '../services/manage-order';
import { PrintOrder } from '../services/print-order';

@Service()
export class OrdersStore {
  readonly #barOrders = inject(BarOrders);
  readonly #barOrderHistory = inject(BarOrderHistory);
  readonly #createOrder = inject(CreateOrder);
  readonly #deleteOrder = inject(DeleteOrder);
  readonly #manageOrder = inject(ManageOrder);
  readonly #printOrder = inject(PrintOrder);
  readonly #socketService = inject(Socket);
  readonly #toastService = inject(Toast);

  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #historyDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly #ordersResource = httpResource(() => this.#barOrders.execute(this.#currentBarId(), 'OPEN'), {
    parse: (orders) => orderArrayMapper(orders),
  });

  readonly #historyResource = httpResource(
    () => this.#barOrderHistory.execute(this.#currentBarId(), this.#historyDate()),
    {
      parse: (orders) => orderArrayMapper(orders),
    },
  );

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly list = this.#ordersResource.asReadonly();
  public readonly history = this.#historyResource.asReadonly();

  public readonly openOrders = computed(() => {
    if (this.#ordersResource.hasValue()) {
      return this.#ordersResource.value()?.filter((o) => o.status === OrderStatus.OPEN) ?? [];
    }
    return [];
  });

  public readonly totalOpen = computed(() => this.openOrders().length);

  public readonly totalRevenue = computed(() => {
    if (this.#ordersResource.hasValue()) {
      return (
        this.#ordersResource
          .value()
          ?.filter((o) => o.status === OrderStatus.CLOSED)
          .reduce((sum, o) => sum + o.totalAmount, 0) ?? 0
      );
    }
    return 0;
  });

  public readonly closedOrders = computed(
    () => this.#historyResource.value()?.filter((o) => o.status === OrderStatus.CLOSED) ?? [],
  );
  public readonly cancelledOrders = computed(
    () => this.#historyResource.value()?.filter((o) => o.status === OrderStatus.CANCELLED) ?? [],
  );
  public readonly totalOrders = computed(() => this.#historyResource.value()?.length ?? 0);
  public readonly totalClosed = computed(() => this.closedOrders().length);
  public readonly totalCancelled = computed(() => this.cancelledOrders().length);
  public readonly historyTotalRevenue = computed(() => this.closedOrders().reduce((sum, o) => sum + o.totalAmount, 0));
  public readonly averageTicket = computed(() => {
    const closed = this.closedOrders();
    if (closed.length === 0) return 0;
    return Math.round(this.historyTotalRevenue() / closed.length);
  });

  public readonly selectedDate = computed(() => this.#historyDate());

  constructor() {
    const isTodayOrMatchDate = (dateStr: Date | string | undefined) => {
      if (!dateStr) return false;
      const targetDate = new Date(dateStr).toISOString().split('T')[0];
      return targetDate === this.#historyDate();
    };

    // Order created
    effect(() => {
      const created = this.#socketService.orderCreated();
      if (created && this.#currentBarId() === created.barId) {
        this.#ordersResource.update((orders) => {
          if (!orders) return [created];
          const exists = orders.some((o) => o.id === created.id);
          return exists ? orders : [...orders, created];
        });

        if (isTodayOrMatchDate(created.createdAt)) {
          this.#historyResource.update((orders) => {
            if (!orders) return [created];
            const exists = orders.some((o) => o.id === created.id);
            return exists ? orders : [...orders, created];
          });
        }
      }
    });

    // Order updated
    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#currentBarId() === updated.barId) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === updated.id ? updated : o));
        });

        if (isTodayOrMatchDate(updated.createdAt)) {
          this.#historyResource.update((orders) => {
            if (!orders) return undefined;
            return orders.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      }
    });

    // Order closed
    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentBarId() === closed.barId) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === closed.id ? closed : o));
        });

        if (isTodayOrMatchDate(closed.createdAt)) {
          this.#historyResource.update((orders) => {
            if (!orders) return undefined;
            return orders.map((o) => (o.id === closed.id ? closed : o));
          });
        }
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

        this.#historyResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === cancelled.id ? { ...o, status: OrderStatus.CANCELLED } : o));
        });
      }
    });

    // Order item added
    effect(() => {
      const itemAdded = this.#socketService.orderItemAdded();
      if (itemAdded && this.#currentBarId() === itemAdded.barId) {
        this.#ordersResource.update((orders) => {
          if (!orders) return undefined;
          return orders.map((o) => (o.id === itemAdded.id ? itemAdded : o));
        });

        if (isTodayOrMatchDate(itemAdded.createdAt)) {
          this.#historyResource.update((orders) => {
            if (!orders) return undefined;
            return orders.map((o) => (o.id === itemAdded.id ? itemAdded : o));
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

        this.#historyResource.update((orders) => {
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

  public reloadHistory() {
    this.#historyResource.reload();
  }

  public setHistoryDate(date: string) {
    console.log('set history date');
    this.#historyDate.set(date);
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
    try {
      await this.#createOrder.execute(barId, dto);
      return { error: null };
    } catch (error) {
      return { error: handleErrorFormField(error) };
    }
  }

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#manageOrder.getOrder(barId, orderId);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    try {
      await this.#manageOrder.addItems(barId, orderId, dto);
    } catch (e) {
      this.#toastService.error('ERR_ADD_ITEMS');
      throw e;
    }
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    try {
      await this.#manageOrder.bulkUpdate(barId, orderId, dto);
    } catch (error) {
      this.#toastService.error('ERR_PAYMENT');
      throw error;
    }
  }

  public async checkout(barId: BarId, orderId: OrderId, paymentMethod: PaymentMethod): Promise<void> {
    try {
      await this.#manageOrder.checkout(barId, orderId, { paymentMethod });
    } catch (error) {
      this.#toastService.error('ERR_CHECKOUT');
      throw error;
    }
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    try {
      await this.#manageOrder.cancel(barId, orderId);
    } catch (error) {
      this.#toastService.error('ERR_CANCEL_ORDER');
      throw error;
    }
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    try {
      await this.#manageOrder.moveTable(barId, orderId, dto);
    } catch (error) {
      this.#toastService.error('ERR_MOVE_TABLE');
      throw error;
    }
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    try {
      await this.#manageOrder.merge(barId, dto);
    } catch (error) {
      this.#toastService.error('ERR_MERGE_TABLES');
      throw error;
    }
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    try {
      await this.#manageOrder.removeItem(barId, orderId, itemId);
    } catch (error) {
      this.#toastService.error('ERR_REMOVE_ITEM');
      throw error;
    }
  }

  public async deleteOrder(barId: BarId, orderId: OrderId): Promise<void> {
    try {
      await this.#deleteOrder.execute(barId, orderId);
    } catch (error) {
      this.#toastService.error('ERR_DELETE_ORDER');
      throw error;
    }
  }

  public async printOrder(order: Order): Promise<void> {
    try {
      await this.#printOrder.execute(order);
    } catch (error) {
      this.#toastService.error('ERR_PRINT_ORDER');
      throw error;
    }
  }
}

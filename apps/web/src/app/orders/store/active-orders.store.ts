import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type {
  AddOrderAdjustmentDto,
  AddOrderItemsDto,
  EstablishmentId,
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
import { EstablishmentOrders } from '../services/establishment-orders';
import { CreateOrder } from '../services/create-order';
import { DeleteOrder } from '../services/delete-order';
import { ManageOrder } from '../services/manage-order';

@Service()
export class ActiveOrdersStore {
  readonly #establishmentOrders = inject(EstablishmentOrders);
  readonly #createOrder = inject(CreateOrder);
  readonly #deleteOrder = inject(DeleteOrder);
  readonly #manageOrder = inject(ManageOrder);
  readonly #socketService = inject(Socket);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #ordersResource = httpResource(
    () => this.#establishmentOrders.execute(this.#currentEstablishmentId(), OrderStatus.OPEN),
    {
      parse: (orders) => orderArrayMapper(orders),
    },
  );

  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
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
      if (created && this.#currentEstablishmentId() === created.establishmentId) {
        upsertOrder(created);
      }
    });

    effect(() => {
      const updated = this.#socketService.orderUpdated();
      if (updated && this.#currentEstablishmentId() === updated.establishmentId) {
        upsertOrder(updated);
      }
    });

    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentEstablishmentId() === closed.establishmentId) {
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
      if (itemAdded && this.#currentEstablishmentId() === itemAdded.establishmentId) {
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
        const currentEstablishmentId = this.#currentEstablishmentId();
        if (currentEstablishmentId) {
          this.getOrder(currentEstablishmentId, orderId).then((updatedOrder) => {
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

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
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

  public async create(establishmentId: EstablishmentId, dto: CreateOrderDto) {
    await this.#createOrder.execute(establishmentId, dto);
  }

  public async getOrder(establishmentId: EstablishmentId, orderId: OrderId) {
    return await this.#manageOrder.getOrder(establishmentId, orderId);
  }

  public async addItems(establishmentId: EstablishmentId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    await this.#manageOrder.addItems(establishmentId, orderId, dto);
  }

  public async bulkUpdate(establishmentId: EstablishmentId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    await this.#manageOrder.bulkUpdate(establishmentId, orderId, dto);
  }

  public async checkout(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    paymentMethod: PaymentMethod,
  ): Promise<void> {
    await this.#manageOrder.checkout(establishmentId, orderId, { paymentMethod });
  }

  public async cancel(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    await this.#manageOrder.cancel(establishmentId, orderId);
  }

  public async moveTable(establishmentId: EstablishmentId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    await this.#manageOrder.moveTable(establishmentId, orderId, dto);
  }

  public async merge(establishmentId: EstablishmentId, dto: MergeOrdersDto): Promise<void> {
    await this.#manageOrder.merge(establishmentId, dto);
  }

  public async removeItem(establishmentId: EstablishmentId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    await this.#manageOrder.removeItem(establishmentId, orderId, itemId);
  }

  public async deleteOrder(establishmentId: EstablishmentId, orderId: OrderId): Promise<void> {
    await this.#deleteOrder.execute(establishmentId, orderId);
  }

  public async updateTip(establishmentId: EstablishmentId, orderId: OrderId, tipAmount: number): Promise<void> {
    const original = this.optimisticUpdate(orderId, (o) => ({
      ...o,
      tipAmount,
      payableTotal: (o.orderTotal ?? o.totalAmount) + tipAmount,
    }));
    try {
      await this.#manageOrder.updateTip(establishmentId, orderId, { tipAmount });
    } catch (e) {
      this.revertUpdate(original);
      throw e;
    }
  }

  public async addAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    dto: AddOrderAdjustmentDto,
  ): Promise<void> {
    await this.#manageOrder.addAdjustment(establishmentId, orderId, dto);
  }

  public async removeAdjustment(
    establishmentId: EstablishmentId,
    orderId: OrderId,
    adjustmentId: string,
  ): Promise<void> {
    await this.#manageOrder.removeAdjustment(establishmentId, orderId, adjustmentId);
  }
}

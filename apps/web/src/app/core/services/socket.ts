import { effect, inject, OnDestroy, Service, signal } from '@angular/core';
import type { Category, Order, OrderAdjustment, Product, Shift, Table } from '@coaster/common';
import { SocketEvents } from '@coaster/common';
import { environment } from '@coaster/env';
import { io, Socket as SocketClient } from 'socket.io-client';
import { Auth } from './auth';

const JOIN_ESTABLISHMENT_MAX_ATTEMPTS = 3;
const JOIN_ESTABLISHMENT_RETRY_MS = 1000;

@Service()
export class Socket implements OnDestroy {
  readonly #auth = inject(Auth);
  #socket: SocketClient | null = null;
  readonly #currentEstablishmentId = signal<string | null>(null);
  readonly #connected = signal(false);
  readonly connected = this.#connected.asReadonly();

  readonly orderCreated = signal<Order | null>(null);
  readonly orderUpdated = signal<Order | null>(null);
  readonly orderClosed = signal<Order | null>(null);
  readonly orderCancelled = signal<{ id: string } | Order | null>(null);
  readonly orderItemAdded = signal<Order | null>(null);
  readonly orderTipUpdated = signal<{ orderId: string; tipAmount: number } | null>(null);
  readonly orderAdjustmentsUpdated = signal<{ orderId: string; adjustments: OrderAdjustment[] } | null>(null);
  readonly tableStatusChanged = signal<Partial<Table> | null>(null);
  readonly productCreated = signal<Product | null>(null);
  readonly productStockChanged = signal<Product | null>(null);
  readonly productDeleted = signal<{ id: string } | null>(null);
  readonly categoryDeleted = signal<{ id: string } | null>(null);
  readonly memberRemoved = signal<{ id: string } | null>(null);
  readonly tableCreated = signal<Table | null>(null);
  readonly tableUpdated = signal<Table | null>(null);
  readonly tableDeleted = signal<{ id: string } | null>(null);
  readonly categoryCreated = signal<Category | null>(null);
  readonly categoryUpdated = signal<Category | null>(null);
  readonly productUpdated = signal<Product | null>(null);
  readonly orderDeleted = signal<{ id: string } | null>(null);
  readonly shiftCreated = signal<Shift | null>(null);
  readonly shiftDeleted = signal<{ id: string } | null>(null);
  readonly memberInvited = signal<{ id: string } | null>(null);
  readonly memberRoleChanged = signal<{ id: string; userId: string; role: string } | null>(null);
  readonly subscriptionUpdated = signal<{ establishmentId: string } | null>(null);

  constructor() {
    effect(() => {
      const token = this.#auth.idToken();

      if (!token) {
        this.#teardown();
        return;
      }

      this.connect(token);
    });

    effect(() => {
      const establishmentId = this.#currentEstablishmentId();
      const isConnected = this.#connected();

      if (establishmentId && isConnected) {
        this.#joinEstablishment(establishmentId);
      }
    });
  }

  public connect(token: string | null | undefined = this.#auth.idToken()) {
    if (!token) {
      return;
    }

    if (this.#socket) {
      this.#socket.auth = { token };

      if (!this.#socket.connected && !this.#socket.active) {
        this.#socket.connect();
      }

      return;
    }

    this.#socket = io(environment.apiUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      auth: { token },
    });

    this.#socket.on('connect', () => {
      this.#connected.set(true);
    });

    this.#socket.on('disconnect', () => {
      this.#connected.set(false);
    });

    this.#socket.on(SocketEvents.unauthorized, () => {
      this.#connected.set(false);
      this.#socket?.disconnect();
    });

    this.#socket.on(SocketEvents.orderCreated, (order: Order) => {
      this.orderCreated.set(order);
    });

    this.#socket.on(SocketEvents.orderUpdated, (order: Order) => {
      this.orderUpdated.set(order);
    });

    this.#socket.on(SocketEvents.orderClosed, (order: Order) => {
      this.orderClosed.set(order);
    });

    this.#socket.on(SocketEvents.orderCancelled, (payload: { id: string }) => {
      this.orderCancelled.set(payload);
    });

    this.#socket.on(SocketEvents.orderItemAdded, (order: Order) => {
      this.orderItemAdded.set(order);
    });

    this.#socket.on(SocketEvents.orderTipUpdated, (payload: { orderId: string; tipAmount: number }) => {
      this.orderTipUpdated.set(payload);
    });

    this.#socket.on(
      SocketEvents.orderAdjustmentsUpdated,
      (payload: { orderId: string; adjustments: OrderAdjustment[] }) => {
        this.orderAdjustmentsUpdated.set(payload);
      },
    );

    this.#socket.on(SocketEvents.tableStatusChanged, (table: Partial<Table>) => {
      this.tableStatusChanged.set(table);
    });

    this.#socket.on(SocketEvents.productCreated, (product: Product) => {
      this.productCreated.set(product);
    });

    this.#socket.on(SocketEvents.productStockChanged, (product: Product) => {
      this.productStockChanged.set(product);
    });

    this.#socket.on(SocketEvents.productDeleted, (payload: { id: string }) => {
      this.productDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.categoryDeleted, (payload: { id: string }) => {
      this.categoryDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.memberRemoved, (payload: { id: string }) => {
      this.memberRemoved.set(payload);
    });

    this.#socket.on(SocketEvents.tableCreated, (table: Table) => {
      this.tableCreated.set(table);
    });

    this.#socket.on(SocketEvents.tableUpdated, (table: Table) => {
      this.tableUpdated.set(table);
    });

    this.#socket.on(SocketEvents.tableDeleted, (payload: { id: string }) => {
      this.tableDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.categoryCreated, (category: Category) => {
      this.categoryCreated.set(category);
    });

    this.#socket.on(SocketEvents.categoryUpdated, (category: Category) => {
      this.categoryUpdated.set(category);
    });

    this.#socket.on(SocketEvents.productUpdated, (product: Product) => {
      this.productUpdated.set(product);
    });

    this.#socket.on(SocketEvents.orderDeleted, (payload: { id: string }) => {
      this.orderDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.shiftCreated, (shift: Shift) => {
      this.shiftCreated.set(shift);
    });

    this.#socket.on(SocketEvents.shiftDeleted, (payload: { id: string }) => {
      this.shiftDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.memberRoleChanged, (payload: { id: string; userId: string; role: string }) => {
      this.memberRoleChanged.set(payload);
    });

    this.#socket.on(SocketEvents.memberInvited, (payload: { id: string }) => {
      this.memberInvited.set(payload);
    });

    this.#socket.on(SocketEvents.subscriptionUpdated, (payload: { establishmentId: string }) => {
      this.subscriptionUpdated.set(payload);
    });
  }

  public joinEstablishment(establishmentId: string) {
    this.#currentEstablishmentId.set(establishmentId);
    this.connect();
  }

  #joinEstablishment(establishmentId: string, attempt = 1) {
    this.#socket?.emit(
      SocketEvents.joinEstablishment,
      establishmentId,
      (ack?: { status?: string; message?: string }) => {
        if (ack?.status !== 'error') {
          return;
        }

        console.error(
          `Could not join the realtime room for establishment ${establishmentId}: ${ack.message ?? 'unknown error'}`,
        );

        if (attempt < JOIN_ESTABLISHMENT_MAX_ATTEMPTS && this.#currentEstablishmentId() === establishmentId) {
          setTimeout(() => this.#joinEstablishment(establishmentId, attempt + 1), JOIN_ESTABLISHMENT_RETRY_MS);
        }
      },
    );
  }

  public leaveEstablishment(establishmentId: string) {
    if (this.#currentEstablishmentId() === establishmentId) {
      this.#currentEstablishmentId.set(null);
    }

    if (this.#socket?.connected) {
      this.#socket.emit(SocketEvents.leaveEstablishment, establishmentId);
    }
  }

  #teardown() {
    if (!this.#socket) {
      return;
    }

    this.#socket.disconnect();
    this.#socket = null;
    this.#connected.set(false);
  }

  ngOnDestroy() {
    this.#currentEstablishmentId.set(null);
    this.#teardown();
  }
}

import { OnDestroy, Service, signal } from '@angular/core';
import type { Category, Order, Product, Shift, Table } from '@coaster/common';
import { SocketEvents } from '@coaster/common';
import { environment } from '@coaster/env';
import { io, Socket as SocketClient } from 'socket.io-client';

@Service()
export class Socket implements OnDestroy {
  #socket: SocketClient | null = null;
  readonly #connected = signal(false);
  readonly connected = this.#connected.asReadonly();

  // Expose signals for different events
  readonly orderCreated = signal<Order | null>(null);
  readonly orderUpdated = signal<Order | null>(null);
  readonly orderClosed = signal<Order | null>(null);
  readonly orderCancelled = signal<{ id: string } | Order | null>(null);
  readonly orderItemAdded = signal<Order | null>(null);
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

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.#socket?.connected) {
      return;
    }

    this.#socket = io(environment.apiUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });

    this.#socket.on('connect', () => {
      this.#connected.set(true);
    });

    this.#socket.on('disconnect', () => {
      this.#connected.set(false);
    });

    // Listen to business events
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

    this.#socket.on(SocketEvents.memberInvited, (payload: { id: string }) => {
      this.memberInvited.set(payload);
    });
  }

  public joinBar(barId: string) {
    if (this.#socket?.connected) {
      this.#socket.emit(SocketEvents.joinBar, barId);
    } else {
      // Retry once connected
      this.#socket?.once('connect', () => {
        this.#socket?.emit(SocketEvents.joinBar, barId);
      });
    }
  }

  public leaveBar(barId: string) {
    if (this.#socket?.connected) {
      this.#socket.emit(SocketEvents.leaveBar, barId);
    }
  }

  ngOnDestroy() {
    if (this.#socket) {
      this.#socket.disconnect();
      this.#socket = null;
    }
  }
}

import { Injectable, OnDestroy, signal } from '@angular/core';
import { BarMember, Category, Order, Product, SocketEvents, Table } from '@coaster/common';
import { environment } from '@coaster/env';
import { io, Socket as SocketClient } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
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
    this.#socket.on(SocketEvents.ORDER_CREATED, (order: Order) => {
      this.orderCreated.set(order);
    });

    this.#socket.on(SocketEvents.ORDER_UPDATED, (order: Order) => {
      this.orderUpdated.set(order);
    });

    this.#socket.on(SocketEvents.ORDER_CLOSED, (order: Order) => {
      this.orderClosed.set(order);
    });

    this.#socket.on(SocketEvents.ORDER_CANCELLED, (payload: { id: string }) => {
      this.orderCancelled.set(payload);
    });

    this.#socket.on(SocketEvents.ORDER_ITEM_ADDED, (order: Order) => {
      this.orderItemAdded.set(order);
    });

    this.#socket.on(SocketEvents.TABLE_STATUS_CHANGED, (table: Partial<Table>) => {
      this.tableStatusChanged.set(table);
    });

    this.#socket.on(SocketEvents.PRODUCT_CREATED, (product: Product) => {
      this.productCreated.set(product);
    });

    this.#socket.on(SocketEvents.PRODUCT_STOCK_CHANGED, (product: Product) => {
      this.productStockChanged.set(product);
    });

    this.#socket.on(SocketEvents.PRODUCT_DELETED, (payload: { id: string }) => {
      this.productDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.CATEGORY_DELETED, (payload: { id: string }) => {
      this.categoryDeleted.set(payload);
    });

    this.#socket.on(SocketEvents.MEMBER_REMOVED, (payload: { id: string }) => {
      this.memberRemoved.set(payload);
    });

    this.#socket.on(SocketEvents.TABLE_CREATED, (table: Table) => {
      this.tableCreated.set(table);
    });

    this.#socket.on(SocketEvents.TABLE_UPDATED, (table: Table) => {
      this.tableUpdated.set(table);
    });

    this.#socket.on(SocketEvents.TABLE_DELETED, (payload: { id: string }) => {
      this.tableDeleted.set(payload);
    });
  }

  public joinBar(barId: string) {
    if (this.#socket?.connected) {
      this.#socket.emit(SocketEvents.JOIN_BAR, barId);
    } else {
      // Retry once connected
      this.#socket?.once('connect', () => {
        this.#socket?.emit(SocketEvents.JOIN_BAR, barId);
      });
    }
  }

  public leaveBar(barId: string) {
    if (this.#socket?.connected) {
      this.#socket.emit(SocketEvents.LEAVE_BAR, barId);
    }
  }

  ngOnDestroy() {
    if (this.#socket) {
      this.#socket.disconnect();
      this.#socket = null;
    }
  }
}

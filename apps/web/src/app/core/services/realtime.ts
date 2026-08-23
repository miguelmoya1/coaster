import { computed, effect, inject, OnDestroy, Service, signal, untracked } from '@angular/core';
import type { Category, Order, OrderAdjustment, Product, Shift, Table } from '@coaster/common';
import { RealtimeEvents } from '@coaster/common';
import { environment } from '@coaster/env';
import { readSse, SseFrame } from '../utils/sse.utils';
import { Auth } from './auth';

const API_VERSION = 'api/v1';
const RETRY_FLOOR_MS = 1000;
const RETRY_CEILING_MS = 30_000;
const STABLE_STREAM_MS = 10_000;

@Service()
export class Realtime implements OnDestroy {
  readonly #auth = inject(Auth);
  readonly #hasSession = computed(() => Boolean(this.#auth.idToken()));
  readonly #establishmentId = signal<string | null>(null);
  readonly #connected = signal(false);
  readonly connected = this.#connected.asReadonly();

  readonly orderCreated = signal<Order | null>(null);
  readonly orderUpdated = signal<Order | null>(null);
  readonly orderClosed = signal<Order | null>(null);
  readonly orderCancelled = signal<{ id: string } | Order | null>(null);
  readonly orderItemAdded = signal<Order | null>(null);
  readonly orderTipUpdated = signal<{ orderId: string; tipAmount: number } | null>(null);
  readonly orderAdjustmentsUpdated = signal<{ orderId: string; adjustments: OrderAdjustment[] } | null>(null);
  readonly orderDeleted = signal<{ id: string } | null>(null);
  readonly tableStatusChanged = signal<Partial<Table> | null>(null);
  readonly tableCreated = signal<Table | null>(null);
  readonly tableUpdated = signal<Table | null>(null);
  readonly tableDeleted = signal<{ id: string } | null>(null);
  readonly productCreated = signal<Product | null>(null);
  readonly productUpdated = signal<Product | null>(null);
  readonly productStockChanged = signal<Product | null>(null);
  readonly productDeleted = signal<{ id: string } | null>(null);
  readonly categoryCreated = signal<Category | null>(null);
  readonly categoryUpdated = signal<Category | null>(null);
  readonly categoryDeleted = signal<{ id: string } | null>(null);
  readonly memberInvited = signal<{ id: string } | null>(null);
  readonly memberRemoved = signal<{ id: string } | null>(null);
  readonly memberRoleChanged = signal<{ id: string; userId: string; role: string } | null>(null);
  readonly shiftCreated = signal<Shift | null>(null);
  readonly shiftDeleted = signal<{ id: string } | null>(null);
  readonly subscriptionUpdated = signal<{ establishmentId: string } | null>(null);

  readonly #inbox: Record<RealtimeEvents, { set(value: unknown): void }> = {
    orderCreated: this.orderCreated,
    orderUpdated: this.orderUpdated,
    orderClosed: this.orderClosed,
    orderCancelled: this.orderCancelled,
    orderItemAdded: this.orderItemAdded,
    orderTipUpdated: this.orderTipUpdated,
    orderAdjustmentsUpdated: this.orderAdjustmentsUpdated,
    orderDeleted: this.orderDeleted,
    tableStatusChanged: this.tableStatusChanged,
    tableCreated: this.tableCreated,
    tableUpdated: this.tableUpdated,
    tableDeleted: this.tableDeleted,
    productCreated: this.productCreated,
    productUpdated: this.productUpdated,
    productStockChanged: this.productStockChanged,
    productDeleted: this.productDeleted,
    categoryCreated: this.categoryCreated,
    categoryUpdated: this.categoryUpdated,
    categoryDeleted: this.categoryDeleted,
    memberInvited: this.memberInvited,
    memberRemoved: this.memberRemoved,
    memberRoleChanged: this.memberRoleChanged,
    shiftCreated: this.shiftCreated,
    shiftDeleted: this.shiftDeleted,
    subscriptionUpdated: this.subscriptionUpdated,
  };

  #abort: AbortController | null = null;
  #lastEventId: string | null = null;
  #generation = 0;

  constructor() {
    effect(() => {
      const establishmentId = this.#establishmentId();
      const hasSession = this.#hasSession();

      this.#stop();

      if (establishmentId && hasSession) {
        void this.#watch(establishmentId, this.#generation);
      }
    });
  }

  public watch(establishmentId: string) {
    this.#establishmentId.set(establishmentId);
  }

  public unwatch(establishmentId: string) {
    if (this.#establishmentId() === establishmentId) {
      this.#establishmentId.set(null);
    }
  }

  async #watch(establishmentId: string, generation: number) {
    let attempt = 0;

    while (generation === this.#generation) {
      const startedAt = Date.now();
      const refused = await this.#stream(establishmentId);

      this.#connected.set(false);

      if (refused || generation !== this.#generation) {
        return;
      }

      attempt = Date.now() - startedAt > STABLE_STREAM_MS ? 0 : attempt + 1;
      await this.#pause(attempt);
    }
  }

  async #stream(establishmentId: string): Promise<boolean> {
    const token = untracked(this.#auth.idToken);

    if (!token) {
      return false;
    }

    const abort = new AbortController();
    this.#abort = abort;

    try {
      const response = await fetch(`${environment.apiUrl}/${API_VERSION}/establishments/${establishmentId}/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'text/event-stream',
          ...(this.#lastEventId ? { 'Last-Event-ID': this.#lastEventId } : {}),
        },
        signal: abort.signal,
      });

      if (response.status === 403) {
        console.error(`No longer allowed to watch establishment ${establishmentId}`);
        return true;
      }

      if (!response.ok || !response.body) {
        return false;
      }

      this.#connected.set(true);

      for await (const frame of readSse(response.body)) {
        this.#receive(frame);
      }

      return false;
    } catch {
      return false;
    }
  }

  #receive(frame: SseFrame) {
    if (frame.id) {
      this.#lastEventId = frame.id;
    }

    this.#inbox[frame.event as RealtimeEvents]?.set(JSON.parse(frame.data) as unknown);
  }

  #pause(attempt: number): Promise<void> {
    const ceiling = Math.min(RETRY_CEILING_MS, RETRY_FLOOR_MS * 2 ** (attempt - 1));
    const delay = ceiling * (0.5 + Math.random() / 2);

    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  #stop() {
    this.#generation += 1;
    this.#abort?.abort();
    this.#abort = null;
    this.#lastEventId = null;
    this.#connected.set(false);
  }

  ngOnDestroy() {
    this.#establishmentId.set(null);
    this.#stop();
  }
}

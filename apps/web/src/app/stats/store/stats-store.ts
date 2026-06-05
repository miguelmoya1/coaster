import { httpResource } from '@angular/common/http';
import { inject, Service, signal, effect } from '@angular/core';
import type { BarId, BarStats as CommonBarStats } from '@coaster/common';
import { Socket } from '@coaster/core';
import { BarStats } from '../services/bar-stats';

@Service()
export class StatsStore {
  readonly #barStats = inject(BarStats);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #statsResource = httpResource<CommonBarStats>(() => this.#barStats.execute(this.#currentBarId()));

  public readonly currentBarId = this.#currentBarId.asReadonly();
  public readonly stats = this.#statsResource.asReadonly();

  constructor() {
    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentBarId() === closed.barId) {
        this.reloadStats();
      }
    });

    effect(() => {
      const cancelled = this.#socketService.orderCancelled();
      if (cancelled) {
        this.reloadStats();
      }
    });

    effect(() => {
      const deleted = this.#socketService.orderDeleted();
      if (deleted) {
        this.reloadStats();
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadStats() {
    this.#statsResource.reload();
  }
}

import { httpResource } from '@angular/common/http';
import { inject, Service, signal, effect } from '@angular/core';
import type { EstablishmentId, EstablishmentStats as CommonEstablishmentStats } from '@coaster/common';
import { Socket } from '@coaster/core';
import { EstablishmentStats } from '../services/establishment-stats';

@Service()
export class StatsStore {
  readonly #establishmentStats = inject(EstablishmentStats);
  readonly #socketService = inject(Socket);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #statsResource = httpResource<CommonEstablishmentStats>(() =>
    this.#establishmentStats.execute(this.#currentEstablishmentId()),
  );

  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();
  public readonly stats = this.#statsResource.asReadonly();

  constructor() {
    effect(() => {
      const closed = this.#socketService.orderClosed();
      if (closed && this.#currentEstablishmentId() === closed.establishmentId) {
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

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reloadStats() {
    this.#statsResource.reload();
  }
}

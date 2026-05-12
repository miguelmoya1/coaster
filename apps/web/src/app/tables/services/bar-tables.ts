import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable } from '@angular/core';
import { TableStatus } from '@coaster/common';
import { BarsStore } from '../../bars';
import { Socket } from '../../core';
import { TableRepository } from '../data-access/table-repository';
import { tableArrayMapper } from '../mappers/table.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarTables {
  readonly #tableRepository = inject(TableRepository);
  readonly #socketService = inject(Socket);
  readonly #barsStore = inject(BarsStore);

  readonly #all = httpResource(
    () => {
      const barId = this.#barsStore.currentId();
      if (!barId) {
        return undefined;
      }
      return this.#tableRepository.routes.list(barId);
    },
    {
      parse: (tables) => tableArrayMapper(tables),
    },
  );

  readonly all = this.#all.asReadonly();

  public readonly total = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.length ?? 0;
    }
    return undefined;
  });

  public readonly freeCount = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.filter((t) => t.status === TableStatus.FREE).length ?? 0;
    }
    return undefined;
  });

  public readonly occupiedCount = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.filter((t) => t.status === TableStatus.OCCUPIED).length ?? 0;
    }
    return undefined;
  });

  constructor() {
    effect(() => {
      const payload = this.#socketService.tableStatusChanged();
      if (payload && payload.id) {
        this.#all.update((tables) => {
          if (!tables) return undefined;
          return tables.map((t) => (t.id === payload.id ? { ...t, ...payload } : t));
        });
      }
    });
  }

  public reload() {
    this.#all.reload();
  }
}

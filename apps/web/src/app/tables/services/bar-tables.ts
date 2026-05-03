import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BarId, TableStatus } from '@coaster/common';
import { TableRepository } from '../data-access/table-repository';
import { tableArrayMapper } from '../mappers/table.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarTables {
  readonly #tableRepository = inject(TableRepository);
  readonly #barId = signal<BarId | undefined>(undefined);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
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

  public setBarContext(barId: BarId | undefined) {
    this.#barId.set(barId);
  }

  public reload() {
    this.#all.reload();
  }
}

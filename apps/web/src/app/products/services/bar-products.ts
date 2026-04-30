import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';
import { productArrayMapper } from '../mappers/product.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarProducts {
  readonly #productRepository = inject(ProductRepository);
  readonly #barId = signal<BarId | undefined>(undefined);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
      if (!barId) {
        return undefined;
      }
      return this.#productRepository.routes.list(barId);
    },
    {
      parse: (products) => productArrayMapper(products),
    },
  );

  readonly all = this.#all.asReadonly();

  public readonly total = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.length ?? 0;
    }

    return undefined;
  });

  public readonly lowStock = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.filter((p) => p.stockStatus === 'low').length ?? 0;
    }

    return undefined;
  });

  public readonly criticalStock = computed(() => {
    if (this.#all.hasValue()) {
      return this.#all.value()?.filter((p) => p.stockStatus === 'critical').length ?? 0;
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

import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { BarsStore } from '../../bars';
import { ProductRepository } from '../data-access/product-repository';
import { productArrayMapper } from '../mappers/product.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarProducts {
  readonly #productRepository = inject(ProductRepository);
  readonly #barsStore = inject(BarsStore);
  readonly #all = httpResource(
    () => {
      const barId = this.#barsStore.currentBarId();
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

  public reload() {
    this.#all.reload();
  }
}

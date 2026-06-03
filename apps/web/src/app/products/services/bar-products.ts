import { inject, Injectable } from '@angular/core';
import type { BarId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class BarProducts {
  readonly #productRepository = inject(ProductRepository);

  public execute(barId: BarId | null) {
    if (!barId) {
      return undefined;
    }

    return this.#productRepository.routes.list(barId);
  }
}

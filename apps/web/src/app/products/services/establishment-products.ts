import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class EstablishmentProducts {
  readonly #productRepository = inject(ProductRepository);

  public execute(establishmentId: EstablishmentId | null) {
    if (!establishmentId) {
      return undefined;
    }

    return this.#productRepository.routes.list(establishmentId);
  }
}

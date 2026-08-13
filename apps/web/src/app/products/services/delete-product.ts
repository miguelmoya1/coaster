import { inject, Service } from '@angular/core';
import type { EstablishmentId, ProductId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class DeleteProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(establishmentId: EstablishmentId, productId: ProductId) {
    return await this.#productRepository.delete(establishmentId, productId);
  }
}

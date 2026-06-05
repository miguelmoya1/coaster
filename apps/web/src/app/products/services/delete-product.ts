import { inject, Service } from '@angular/core';
import type { BarId, ProductId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class DeleteProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(barId: BarId, productId: ProductId) {
    return await this.#productRepository.delete(barId, productId);
  }
}

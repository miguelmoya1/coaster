import { inject, Service } from '@angular/core';
import type { EstablishmentId, ProductId, UpdateProductDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class UpdateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(establishmentId: EstablishmentId, productId: ProductId, updateProductDto: UpdateProductDto) {
    return await this.#productRepository.update(establishmentId, productId, updateProductDto);
  }
}

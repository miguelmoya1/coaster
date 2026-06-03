import { inject, Injectable } from '@angular/core';
import type { BarId, ProductId, UpdateProductDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(barId: BarId, productId: ProductId, updateProductDto: UpdateProductDto) {
    return await this.#productRepository.update(barId, productId, updateProductDto);
  }
}

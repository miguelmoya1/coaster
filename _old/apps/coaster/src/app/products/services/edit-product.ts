import { inject, Injectable } from '@angular/core';
import { BarId, ProductId, UpdateProductDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class EditProduct {
  readonly #productRepository = inject(ProductRepository);

  public async edit(barId: BarId, productId: ProductId, updateProductDto: UpdateProductDto) {
    return await this.#productRepository.update(barId, productId, updateProductDto);
  }
}

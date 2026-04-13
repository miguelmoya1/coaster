import { inject, Injectable } from '@angular/core';
import { BarId, ProductId,   UpdateProductDto } from '@coaster/interfaces';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async update(barId: BarId, productId: ProductId, updateProductDto: UpdateProductDto) {
    return await this.#productRepository.update(barId, productId, updateProductDto);
  }
}

import { inject, Injectable } from '@angular/core';
import { BarId, ProductId, UpdateProductStockDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async update(barId: BarId, productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    return await this.#productRepository.updateStock(barId, productId, updateProductStockDto);
  }
}

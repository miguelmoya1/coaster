import { inject, Injectable } from '@angular/core';
import { BarId, ProductId, UpdateProductStockDto } from '@coaster/interfaces';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateProductStock {
  readonly #productRepository = inject(ProductRepository);

  public async updateStock(barId: BarId, productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    return await this.#productRepository.updateStock(barId, productId, updateProductStockDto);
  }
}

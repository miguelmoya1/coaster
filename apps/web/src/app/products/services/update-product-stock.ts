import { inject, Service } from '@angular/core';
import type { BarId, ProductId, UpdateProductStockDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class UpdateProductStock {
  readonly #productRepository = inject(ProductRepository);

  public async execute(barId: BarId, productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    return await this.#productRepository.updateStock(barId, productId, updateProductStockDto);
  }
}

import { inject, Service } from '@angular/core';
import type { EstablishmentId, ProductId, UpdateProductStockDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class UpdateProductStock {
  readonly #productRepository = inject(ProductRepository);

  public async execute(
    establishmentId: EstablishmentId,
    productId: ProductId,
    updateProductStockDto: UpdateProductStockDto,
  ) {
    return await this.#productRepository.updateStock(establishmentId, productId, updateProductStockDto);
  }
}

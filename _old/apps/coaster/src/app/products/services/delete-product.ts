import { inject, Injectable } from '@angular/core';
import { BarId, ProductId } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteProduct {
  readonly #productRepository = inject(ProductRepository);

  public async delete(barId: BarId, productId: ProductId) {
    return await this.#productRepository.delete(barId, productId);
  }
}

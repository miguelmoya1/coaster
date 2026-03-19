import { inject, Injectable } from '@angular/core';
import { BarId, ProductId, UpdateProductStatusDto } from '@coaster/interfaces';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class UpdateProductStatus {
  readonly #productRepository = inject(ProductRepository);

  public async updateStatus(barId: BarId, productId: ProductId, updateProductStatusDto: UpdateProductStatusDto) {
    return await this.#productRepository.updateStatus(barId, productId, updateProductStatusDto);
  }
}

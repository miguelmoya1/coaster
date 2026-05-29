import { inject, Injectable } from '@angular/core';
import { BarId, CreateProductDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(barId: BarId, createProductDto: CreateProductDto) {
    return await this.#productRepository.create(barId, createProductDto);
  }
}

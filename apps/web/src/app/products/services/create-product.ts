import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateProductDto } from '@coaster/common';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class CreateProduct {
  readonly #productRepository = inject(ProductRepository);

  public async execute(establishmentId: EstablishmentId, createProductDto: CreateProductDto): Promise<void> {
    await this.#productRepository.create(establishmentId, createProductDto);
  }
}

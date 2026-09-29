import { inject, Service } from '@angular/core';
import type { CreateProductDto, ProductId, UpdateProductDto, UpdateProductStockDto } from '../models/product.interface';
import type { EstablishmentId } from '@coaster/core';
import { ProductRepository } from '../data-access/product-repository';

@Service()
export class ManageProducts {
  readonly #repository = inject(ProductRepository);

  public async create(establishmentId: EstablishmentId, dto: CreateProductDto): Promise<void> {
    await this.#repository.create(establishmentId, dto);
  }

  public async update(establishmentId: EstablishmentId, productId: ProductId, dto: UpdateProductDto): Promise<void> {
    await this.#repository.update(establishmentId, productId, dto);
  }

  public async updateStock(
    establishmentId: EstablishmentId,
    productId: ProductId,
    dto: UpdateProductStockDto,
  ): Promise<void> {
    await this.#repository.updateStock(establishmentId, productId, dto);
  }

  public async delete(establishmentId: EstablishmentId, productId: ProductId): Promise<void> {
    await this.#repository.delete(establishmentId, productId);
  }
}

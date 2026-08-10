import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  EstablishmentId,
  CreateProductDto,
  DeleteResponse,
  ProductId,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/common';
import { deleteResponseMapper } from '@coaster/core';
import { firstValueFrom, map } from 'rxjs';

@Service()
export class ProductRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/products`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/products`,
    update: (establishmentId: EstablishmentId, productId: ProductId) =>
      `/establishments/${establishmentId}/products/${productId}`,
    updateStock: (establishmentId: EstablishmentId, productId: ProductId) =>
      `/establishments/${establishmentId}/products/${productId}/stock`,
    delete: (establishmentId: EstablishmentId, productId: ProductId) =>
      `/establishments/${establishmentId}/products/${productId}`,
  };

  public async create(establishmentId: EstablishmentId, createProductDto: CreateProductDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(establishmentId), createProductDto));
  }

  public async update(
    establishmentId: EstablishmentId,
    productId: ProductId,
    updateProductDto: UpdateProductDto,
  ): Promise<DeleteResponse> {
    return firstValueFrom(
      this.#http.patch<DeleteResponse>(this.routes.update(establishmentId, productId), updateProductDto),
    );
  }

  public async updateStock(
    establishmentId: EstablishmentId,
    productId: ProductId,
    updateProductStockDto: UpdateProductStockDto,
  ): Promise<DeleteResponse> {
    return firstValueFrom(
      this.#http.patch<DeleteResponse>(this.routes.updateStock(establishmentId, productId), updateProductStockDto),
    );
  }

  public async delete(establishmentId: EstablishmentId, productId: ProductId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(establishmentId, productId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

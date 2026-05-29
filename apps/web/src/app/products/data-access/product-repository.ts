import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BarId,
  CreateProductDto,
  CreateResponse,
  DeleteResponse,
  ProductId,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/common';
import { deleteResponseMapper } from '@coaster/core';
import { firstValueFrom, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/products`,
    create: (barId: BarId) => `/bars/${barId}/products`,
    update: (barId: BarId, productId: ProductId) => `/bars/${barId}/products/${productId}`,
    updateStock: (barId: BarId, productId: ProductId) => `/bars/${barId}/products/${productId}/stock`,
    delete: (barId: BarId, productId: ProductId) => `/bars/${barId}/products/${productId}`,
  };

  public async create(barId: BarId, createProductDto: CreateProductDto): Promise<CreateResponse<ProductId>> {
    return firstValueFrom(
      this.#http.post<CreateResponse<ProductId>>(this.routes.create(barId), createProductDto)
    );
  }

  public async update(barId: BarId, productId: ProductId, updateProductDto: UpdateProductDto): Promise<DeleteResponse> {
    return firstValueFrom(
      this.#http.patch<DeleteResponse>(this.routes.update(barId, productId), updateProductDto)
    );
  }

  public async updateStock(barId: BarId, productId: ProductId, updateProductStockDto: UpdateProductStockDto): Promise<DeleteResponse> {
    return firstValueFrom(
      this.#http.patch<DeleteResponse>(this.routes.updateStock(barId, productId), updateProductStockDto)
    );
  }

  public async delete(barId: BarId, productId: ProductId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(barId, productId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}


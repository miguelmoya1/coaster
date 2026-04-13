import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BarId,
  CreateProductDto,
  Product,
  ProductId,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/interfaces';
import { firstValueFrom, map } from 'rxjs';
import { productMapper } from '../mappers/product.mapper';

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
  };

  public async create(barId: BarId, createProductDto: CreateProductDto) {
    return firstValueFrom(
      this.#http.post<Product>(this.routes.create(barId), createProductDto).pipe(map(productMapper)),
    );
  }

  public async update(barId: BarId, productId: ProductId, updateProductDto: UpdateProductDto) {
    return firstValueFrom(
      this.#http.patch<Product>(this.routes.update(barId, productId), updateProductDto).pipe(map(productMapper)),
    );
  }

  public async updateStock(barId: BarId, productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    return firstValueFrom(
      this.#http
        .patch<Product>(this.routes.updateStock(barId, productId), updateProductStockDto)
        .pipe(map(productMapper)),
    );
  }
}

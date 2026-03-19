import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateProductDto, Product, ProductId, UpdateProductStatusDto } from '@coaster/interfaces';
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
    updateStatus: (barId: BarId, productId: ProductId) => `/bars/${barId}/products/${productId}/status`,
  };

  public async create(barId: BarId, createProductDto: CreateProductDto) {
    return firstValueFrom(
      this.#http
        .post<Product>(this.routes.create(barId), createProductDto)
        .pipe(map(productMapper)),
    );
  }

  public async updateStatus(barId: BarId, productId: ProductId, updateProductStatusDto: UpdateProductStatusDto) {
    return firstValueFrom(
      this.#http
        .put<Product>(this.routes.updateStatus(barId, productId), updateProductStatusDto)
        .pipe(map(productMapper)),
    );
  }
}

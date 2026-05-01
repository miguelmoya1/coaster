import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, Category, CategoryId, CreateCategoryDto, DeleteResponse, UpdateCategoryDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '../../core/mappers/common.mapper';
import { categoryMapper } from '../mappers/category.mapper';

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/categories`,
    create: (barId: BarId) => `/bars/${barId}/categories`,
    delete: (barId: BarId, categoryId: string) => `/bars/${barId}/categories/${categoryId}`,
  };

  public async create(barId: BarId, createCategoryDto: CreateCategoryDto) {
    return firstValueFrom(
      this.#http
        .post<Category>(this.routes.create(barId), createCategoryDto)
        .pipe(map((category) => categoryMapper(category))),
    );
  }

  public async update(barId: BarId, categoryId: string, updateCategoryDto: UpdateCategoryDto) {
    return firstValueFrom(
      this.#http
        .patch<Category>(`${this.routes.create(barId)}/${categoryId}`, updateCategoryDto)
        .pipe(map((category) => categoryMapper(category))),
    );
  }

  public async delete(barId: BarId, categoryId: CategoryId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(barId, categoryId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

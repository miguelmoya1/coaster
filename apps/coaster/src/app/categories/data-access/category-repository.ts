import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, Category, CreateCategoryDto, UpdateCategoryDto } from '@coaster/interfaces';
import { firstValueFrom, map } from 'rxjs';
import { categoryMapper } from '../mappers/category.mapper';

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/categories`,
    create: (barId: BarId) => `/bars/${barId}/categories`,
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
}

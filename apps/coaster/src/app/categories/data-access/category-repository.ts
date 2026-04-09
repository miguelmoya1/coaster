import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, Category, CreateCategoryDto } from '@coaster/interfaces';
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
      this.#http.post<Category>(this.routes.create(barId), createCategoryDto).pipe(map(categoryMapper)),
    );
  }
}

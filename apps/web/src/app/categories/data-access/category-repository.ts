import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { BarId, CategoryId, CreateCategoryDto, DeleteResponse, UpdateCategoryDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '../../core/mappers/common.mapper';

@Service()
export class CategoryRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/categories`,
    create: (barId: BarId) => `/bars/${barId}/categories`,
    delete: (barId: BarId, categoryId: string) => `/bars/${barId}/categories/${categoryId}`,
  };

  public async create(barId: BarId, createCategoryDto: CreateCategoryDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(barId), createCategoryDto));
  }

  public async update(barId: BarId, categoryId: string, updateCategoryDto: UpdateCategoryDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(`${this.routes.create(barId)}/${categoryId}`, updateCategoryDto));
  }

  public async delete(barId: BarId, categoryId: CategoryId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(barId, categoryId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

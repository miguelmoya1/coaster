import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  EstablishmentId,
  CategoryId,
  CreateCategoryDto,
  DeleteResponse,
  UpdateCategoryDto,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '@coaster/core';

@Service()
export class CategoryRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/categories`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/categories`,
    delete: (establishmentId: EstablishmentId, categoryId: string) =>
      `/establishments/${establishmentId}/categories/${categoryId}`,
  };

  public async create(establishmentId: EstablishmentId, createCategoryDto: CreateCategoryDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(establishmentId), createCategoryDto));
  }

  public async update(
    establishmentId: EstablishmentId,
    categoryId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<void> {
    return firstValueFrom(
      this.#http.patch<void>(`${this.routes.create(establishmentId)}/${categoryId}`, updateCategoryDto),
    );
  }

  public async delete(establishmentId: EstablishmentId, categoryId: CategoryId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(establishmentId, categoryId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

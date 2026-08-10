import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateTableDto, DeleteResponse, TableId, UpdateTableDto } from '@coaster/common';
import { deleteResponseMapper } from '@coaster/core';
import { firstValueFrom, map } from 'rxjs';

@Service()
export class TableRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/tables`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/tables`,
    update: (establishmentId: EstablishmentId, tableId: TableId) =>
      `/establishments/${establishmentId}/tables/${tableId}`,
    delete: (establishmentId: EstablishmentId, tableId: TableId) =>
      `/establishments/${establishmentId}/tables/${tableId}`,
  };

  public async create(establishmentId: EstablishmentId, dto: CreateTableDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(establishmentId), dto));
  }

  public async update(
    establishmentId: EstablishmentId,
    tableId: TableId,
    dto: UpdateTableDto,
  ): Promise<DeleteResponse> {
    return firstValueFrom(this.#http.patch<DeleteResponse>(this.routes.update(establishmentId, tableId), dto));
  }

  public async delete(establishmentId: EstablishmentId, tableId: TableId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(establishmentId, tableId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

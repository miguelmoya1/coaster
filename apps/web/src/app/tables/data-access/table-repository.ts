import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { BarId, CreateTableDto, DeleteResponse, TableId, UpdateTableDto } from '@coaster/common';
import { deleteResponseMapper } from '@coaster/core';
import { firstValueFrom, map } from 'rxjs';

@Service()
export class TableRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/tables`,
    create: (barId: BarId) => `/bars/${barId}/tables`,
    update: (barId: BarId, tableId: TableId) => `/bars/${barId}/tables/${tableId}`,
    delete: (barId: BarId, tableId: TableId) => `/bars/${barId}/tables/${tableId}`,
  };

  public async create(barId: BarId, dto: CreateTableDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(barId), dto));
  }

  public async update(barId: BarId, tableId: TableId, dto: UpdateTableDto): Promise<DeleteResponse> {
    return firstValueFrom(this.#http.patch<DeleteResponse>(this.routes.update(barId, tableId), dto));
  }

  public async delete(barId: BarId, tableId: TableId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(barId, tableId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

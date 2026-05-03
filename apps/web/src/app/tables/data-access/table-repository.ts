import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BarId, CreateTableDto, DeleteResponse, Table, TableId, UpdateTableDto } from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { deleteResponseMapper } from '../../core/mappers/common.mapper';
import { tableMapper } from '../mappers/table.mapper';

@Injectable({
  providedIn: 'root',
})
export class TableRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/tables`,
    create: (barId: BarId) => `/bars/${barId}/tables`,
    update: (barId: BarId, tableId: TableId) => `/bars/${barId}/tables/${tableId}`,
    delete: (barId: BarId, tableId: TableId) => `/bars/${barId}/tables/${tableId}`,
  };

  public async create(barId: BarId, dto: CreateTableDto) {
    return firstValueFrom(
      this.#http.post<Table>(this.routes.create(barId), dto).pipe(map((table) => tableMapper(table))),
    );
  }

  public async update(barId: BarId, tableId: TableId, dto: UpdateTableDto) {
    return firstValueFrom(
      this.#http.patch<Table>(this.routes.update(barId, tableId), dto).pipe(map((table) => tableMapper(table))),
    );
  }

  public async delete(barId: BarId, tableId: TableId) {
    return firstValueFrom(
      this.#http
        .delete<DeleteResponse>(this.routes.delete(barId, tableId))
        .pipe(map((res) => deleteResponseMapper(res))),
    );
  }
}

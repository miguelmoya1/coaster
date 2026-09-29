import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { Table } from '../models/table.interface';
import {
  onRealtime,
  patchById,
  Realtime,
  removeById,
  updateLoaded,
  upsertById,
  type EstablishmentId,
} from '@coaster/core';
import { TableRepository } from '../data-access/table-repository';
import { tableArrayMapper } from '../mappers/table.mapper';

export const tablesResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(TableRepository);
  const realtime = inject(Realtime);

  const tables = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.list(id) : undefined;
    },
    { parse: tableArrayMapper },
  );

  const ours = (table: Table) => table.establishmentId === establishmentId();

  onRealtime(realtime.on<Partial<Table>>('tableStatusChanged'), (change) => {
    if (change.id) {
      updateLoaded(tables, (list) => patchById(list, change.id!, (table) => ({ ...table, ...change })));
    }
  });
  onRealtime(realtime.on<Table>('tableCreated'), (created) => {
    if (ours(created)) {
      updateLoaded(tables, (list) => upsertById(list, created));
    }
  });
  onRealtime(realtime.on<Table>('tableUpdated'), (updated) => {
    if (ours(updated)) {
      updateLoaded(tables, (list) => upsertById(list, updated));
    }
  });
  onRealtime(realtime.on<{ id: string }>('tableDeleted'), ({ id }) =>
    updateLoaded(tables, (list) => removeById(list, id)),
  );

  return tables;
};

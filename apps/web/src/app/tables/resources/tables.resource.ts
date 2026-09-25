import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, Table } from '@coaster/common';
import { onRealtime, patchById, Realtime, removeById, updateLoaded, upsertById } from '@coaster/core';
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

  onRealtime(realtime.tableStatusChanged, (change) => {
    if (change.id) {
      updateLoaded(tables, (list) => patchById(list, change.id!, (table) => ({ ...table, ...change })));
    }
  });
  onRealtime(realtime.tableCreated, (created) => {
    if (ours(created)) {
      updateLoaded(tables, (list) => upsertById(list, created));
    }
  });
  onRealtime(realtime.tableUpdated, (updated) => {
    if (ours(updated)) {
      updateLoaded(tables, (list) => upsertById(list, updated));
    }
  });
  onRealtime(realtime.tableDeleted, ({ id }) => updateLoaded(tables, (list) => removeById(list, id)));

  return tables;
};

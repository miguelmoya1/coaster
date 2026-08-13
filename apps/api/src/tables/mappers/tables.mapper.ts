import type { Table } from '@coaster/common';
import { asEstablishmentId, asTableId, asTableStatus } from '@coaster/common';
import { DbTable as TableDb } from '@coaster/core/db';

export const TablesMapper = {
  toDomain(dbTable: TableDb): Table {
    return {
      id: asTableId(dbTable.id),
      establishmentId: asEstablishmentId(dbTable.establishmentId),
      name: dbTable.name,
      status: asTableStatus(dbTable.status),
      createdAt: dbTable.createdAt.toISOString(),
      updatedAt: dbTable.updatedAt.toISOString(),
    };
  },

  toDto(domainEntity: Table): Table {
    return domainEntity;
  },
};

import type { Table } from '@coaster/common';
import { asBarId, asTableId, asTableStatus } from '@coaster/core';
import { DbTable as TableDb } from '@coaster/core/db';

export const TablesMapper = {
  toDomain(dbTable: TableDb): Table {
    return {
      id: asTableId(dbTable.id),
      barId: asBarId(dbTable.barId),
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

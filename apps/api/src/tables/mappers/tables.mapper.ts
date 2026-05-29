import { asBarId, asTableId, asTableStatus, Table } from '@coaster/common';
import { Table as TableDb } from '../../core';

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

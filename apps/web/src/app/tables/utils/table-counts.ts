import type { Table } from '@coaster/common';
import { TableStatus } from '@coaster/common';

export const tableCounts = (tables: Table[]) => ({
  total: tables.length,
  free: tables.filter((table) => table.status === TableStatus.FREE).length,
  occupied: tables.filter((table) => table.status === TableStatus.OCCUPIED).length,
});

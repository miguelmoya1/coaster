import type { Table } from '../models/table.interface';
import { TableStatus } from '../models/table-status.type';

export const tableCounts = (tables: Table[]) => ({
  total: tables.length,
  free: tables.filter((table) => table.status === TableStatus.FREE).length,
  occupied: tables.filter((table) => table.status === TableStatus.OCCUPIED).length,
});

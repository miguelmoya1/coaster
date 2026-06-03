import type { Table } from '@coaster/common';

export const checkIsTable = (table: unknown): table is Table => {
  const t = table as Record<string, unknown>;
  return (
    typeof table === 'object' &&
    table !== null &&
    typeof t['id'] === 'string' &&
    typeof t['barId'] === 'string' &&
    typeof t['name'] === 'string' &&
    typeof t['status'] === 'string'
  );
};

export const tableMapper = (table: unknown): Table => {
  if (!checkIsTable(table)) {
    throw new Error('Invalid Table payload');
  }
  return table;
};

export const tableArrayMapper = (tables: unknown): Table[] => {
  if (!Array.isArray(tables)) throw new Error('Expected array of Tables');
  return tables.map(tableMapper);
};

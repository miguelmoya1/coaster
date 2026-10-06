export const TableStatus = {
  FREE: 'FREE',
  OCCUPIED: 'OCCUPIED',
} as const;

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const asTableStatus = (status: string): TableStatus => {
  const statuses: TableStatus[] = Object.values(TableStatus);
  if (statuses.includes(status as TableStatus)) return status as TableStatus;
  return TableStatus.FREE;
};

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
}

export const asTableStatus = (status: string): TableStatus => {
  if (Object.values(TableStatus).includes(status as TableStatus)) {
    return status as TableStatus;
  }
  console.warn(`Invalid TableStatus mapping: ${status}, defaulting to FREE`);
  return TableStatus.FREE;
};

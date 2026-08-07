export const TableStatus = {
  FREE: 'FREE',
  OCCUPIED: 'OCCUPIED',
} as const;

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

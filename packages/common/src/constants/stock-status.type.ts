export const StockStatus = {
  GOOD: 'GOOD',
  WARNING: 'WARNING',
  ALERT: 'ALERT',
} as const;

export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

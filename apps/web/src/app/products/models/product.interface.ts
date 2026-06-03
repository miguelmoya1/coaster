import type { Product as CommonProduct } from '@coaster/common';

export type StockStatus = 'GOOD' | 'WARNING' | 'ALERT';

export interface Product extends CommonProduct {
  stockStatus: StockStatus;
}

export function calculateStockStatus(current: number, min: number): StockStatus {
  if (current <= 0) return 'ALERT';
  if (current <= min) return 'WARNING';
  return 'GOOD';
}

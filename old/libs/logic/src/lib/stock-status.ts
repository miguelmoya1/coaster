import { StockStatus } from '@coaster/interfaces';

export const resolveStockStatus = (currentStock: number, minStockAlert: number): StockStatus => {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= minStockAlert) return 'low';
  return 'good';
};

import { StockStatus } from '../constants/stock-status.type';

export function calculateStockStatus(current: number, min: number): StockStatus {
  if (current <= 0) return 'ALERT';
  if (current <= min) return 'WARNING';
  return 'GOOD';
}

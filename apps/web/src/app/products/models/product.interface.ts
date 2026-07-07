import type { Product as CommonProduct, StockStatus } from '@coaster/common';

export interface Product extends CommonProduct {
  stockStatus: StockStatus;
}

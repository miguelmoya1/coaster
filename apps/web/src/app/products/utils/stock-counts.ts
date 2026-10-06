import type { Product } from '../models/product.interface';

export const stockCounts = (products: Product[]) => ({
  total: products.length,
  low: products.filter((product) => product.stockStatus === 'WARNING').length,
  critical: products.filter((product) => product.stockStatus === 'ALERT').length,
});

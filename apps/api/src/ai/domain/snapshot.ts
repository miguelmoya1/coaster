import type { Category, Order, Product, Table } from '@coaster/common';

export const PRODUCT_BUDGET_CHARS = 12_000;

export const formatTables = (tables: Table[]): string =>
  tables.map((table) => `- ${table.name}: ID=${table.id}, Status=${table.status}`).join('\n');

export const formatCategories = (categories: Category[]): string =>
  categories.map((category) => `- ${category.name}: ID=${category.id}, Icon=${category.icon || '(None)'}`).join('\n');

export const formatOrders = (orders: Order[], tables: Table[]): string =>
  orders
    .map((order) => {
      const table = tables.find((candidate) => candidate.id === order.tableId);
      const where = table ? table.name : 'No table';
      const items = order.items.length;

      return `- Order ID=${order.id} at ${where} (${items} item${items === 1 ? '' : 's'})`;
    })
    .join('\n');

export interface ProductSnapshot {
  list: string;
  omitted: boolean;
}

export const formatProducts = (products: Product[], budget = PRODUCT_BUDGET_CHARS): ProductSnapshot => {
  const list = products
    .map(
      (product) => `- ${product.name}: ID=${product.id}, Price=${product.price / 100}€, Stock=${product.currentStock}`,
    )
    .join('\n');

  return list.length > budget ? { list: '', omitted: true } : { list, omitted: false };
};

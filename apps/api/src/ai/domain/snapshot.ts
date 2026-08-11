import type { Category, Order, Product, Table } from '@coaster/common';

/**
 * How much of the catalogue travels inside every single message.
 *
 * The snapshot is a cache of what the read tools already return, paid for on every turn whether the
 * question needed it or not. A venue with a few dozen products barely notices; one with a thousand
 * pays for all of them to answer "¿cuánto llevamos hoy?". The budget keeps the cost of a message
 * roughly independent of the size of the catalogue behind it.
 *
 * Sized to hold about 135 products, which covers an ordinary bar without a round trip. Above it the
 * model searches instead — cheaper in tokens, one step slower. This is the dial to turn if the bill
 * still reads high.
 */
export const PRODUCT_BUDGET_CHARS = 12_000;

export const formatTables = (tables: Table[]): string =>
  tables.map((table) => `- ${table.name}: ID=${table.id}, Status=${table.status}`).join('\n');

export const formatCategories = (categories: Category[]): string =>
  categories.map((category) => `- ${category.name}: ID=${category.id}, Icon=${category.icon || '(None)'}`).join('\n');

/**
 * One line per order rather than one per item. `getOrderDetails` returns the lines, so shipping them
 * here bought nothing except tokens: an order of six items cost more to describe than the whole
 * table plan.
 */
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
  /** Empty when the catalogue did not fit, in which case the model is told to search instead. */
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

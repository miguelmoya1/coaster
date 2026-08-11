import type { Order, Product, Table } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import { formatOrders, formatProducts, PRODUCT_BUDGET_CHARS } from './snapshot';

const product = (n: number): Product =>
  ({ id: `product-${n}`, name: `Producto numero ${n}`, price: 250, currentStock: 40 }) as Product;

const catalogue = (size: number) => Array.from({ length: size }, (_, index) => product(index));

describe('formatProducts', () => {
  it('should list a catalogue that fits, because a small venue should never pay a round trip', () => {
    const snapshot = formatProducts(catalogue(20));

    expect(snapshot.omitted).toBe(false);
    expect(snapshot.list).toContain('Producto numero 0');
  });

  it('should drop a catalogue that does not fit rather than let one venue set the bill', () => {
    const snapshot = formatProducts(catalogue(5000));

    expect(snapshot.omitted).toBe(true);
    expect(snapshot.list).toBe('');
  });

  it('should never exceed the budget it was given', () => {
    for (const size of [1, 50, 200, 1000]) {
      expect(formatProducts(catalogue(size)).list.length).toBeLessThanOrEqual(PRODUCT_BUDGET_CHARS);
    }
  });

  it('should keep the id, which is the one thing the tools cannot work without', () => {
    expect(formatProducts([product(7)]).list).toContain('ID=product-7');
  });
});

describe('formatOrders', () => {
  const tables = [{ id: 'table-1', name: 'Mesa 3' }] as Table[];

  const order = (items: number): Order =>
    ({
      id: 'order-1',
      tableId: 'table-1',
      items: Array.from({ length: items }, (_, index) => ({ id: `item-${index}`, productId: 'p', quantity: 2 })),
    }) as Order;

  it('should summarise an order instead of spelling out its lines', () => {
    const line = formatOrders([order(6)], tables);

    expect(line).toBe('- Order ID=order-1 at Mesa 3 (6 items)');
  });

  it('should cost the same however many lines the order carries', () => {
    expect(formatOrders([order(3)], tables).length).toBe(formatOrders([order(9)], tables).length);
  });

  it('should say where an order with no table is', () => {
    expect(formatOrders([{ ...order(1), tableId: undefined } as Order], tables)).toContain('at No table');
  });
});

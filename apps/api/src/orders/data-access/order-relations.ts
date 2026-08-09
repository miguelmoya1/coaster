import { DbPaymentMethod, type DbOrderInclude } from '@coaster/core/db';

export const ORDER_RELATIONS = {
  items: { include: { product: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  adjustments: true,
  table: true,
} satisfies DbOrderInclude;

export const paymentMethodFor = (cash: number, card: number): DbPaymentMethod => {
  if (cash > 0 && card > 0) {
    return DbPaymentMethod.MIXED;
  }

  if (card > 0) {
    return DbPaymentMethod.CARD;
  }

  return cash > 0 ? DbPaymentMethod.CASH : DbPaymentMethod.NONE;
};

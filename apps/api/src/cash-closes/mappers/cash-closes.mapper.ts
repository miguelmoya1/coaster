import type { CashClose } from '@coaster/common';
import { asCashCloseId, asEstablishmentId, asUserId, cashDifferenceOf, expectedCashOf } from '@coaster/common';
import type { DbCashClose } from '@coaster/core/db';

export const CashClosesMapper = {
  toDomain(dbCashClose: DbCashClose & { closedBy: { name: string } }): CashClose {
    return {
      id: asCashCloseId(dbCashClose.id),
      establishmentId: asEstablishmentId(dbCashClose.establishmentId),
      closedById: asUserId(dbCashClose.closedById),
      closedByName: dbCashClose.closedBy.name,
      since: dbCashClose.since?.toISOString() ?? null,
      closedAt: dbCashClose.closedAt.toISOString(),
      closedOrders: dbCashClose.closedOrders,
      cancelledOrders: dbCashClose.cancelledOrders,
      cancelledAmount: dbCashClose.cancelledAmount,
      cashAmount: dbCashClose.cashAmount,
      cardAmount: dbCashClose.cardAmount,
      tipAmount: dbCashClose.tipAmount,
      openingFloat: dbCashClose.openingFloat,
      countedCash: dbCashClose.countedCash,
      expectedCash: expectedCashOf(dbCashClose.openingFloat, dbCashClose.cashAmount),
      difference: cashDifferenceOf(dbCashClose.countedCash, dbCashClose.openingFloat, dbCashClose.cashAmount),
      notes: dbCashClose.notes,
    };
  },
};

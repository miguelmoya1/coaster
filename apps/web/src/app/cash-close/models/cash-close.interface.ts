import type { Brand, EstablishmentId, UserId } from '@coaster/core';

export type CashCloseId = Brand<string, 'CashCloseId'>;

export interface CashCloseTotals {
  closedOrders: number;
  cancelledOrders: number;
  cancelledAmount: number;
  cashAmount: number;
  cardAmount: number;
  tipAmount: number;
}

export interface CashClosePreview extends CashCloseTotals {
  since: string | null;
  openOrders: number;
  openOrdersCharged: number;
  openingFloat: number;
}

export interface CashClose extends CashCloseTotals {
  id: CashCloseId;
  establishmentId: EstablishmentId;
  closedById: UserId;
  closedByName: string;
  since: string | null;
  closedAt: string;
  openingFloat: number;
  countedCash: number;
  expectedCash: number;
  difference: number;
  notes: string | null;
  voidedAt: string | null;
  voidedById: UserId | null;
  voidedByName: string | null;
}

export interface CloseCashDto {
  openingFloat: number;
  countedCash: number;
  notes?: string;
}

export const asCashCloseId = (id: string): CashCloseId => id as CashCloseId;

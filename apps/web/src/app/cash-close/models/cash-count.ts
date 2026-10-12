export const expectedCashOf = (openingFloat: number, cashAmount: number): number => openingFloat + cashAmount;

export const cashDifferenceOf = (countedCash: number, openingFloat: number, cashAmount: number): number =>
  countedCash - expectedCashOf(openingFloat, cashAmount);

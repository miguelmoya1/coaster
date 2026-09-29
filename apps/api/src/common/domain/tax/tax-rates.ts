export const DEFAULT_TAX_RATE = 1000;

export const MAX_TAX_RATE = 10000;

export const resolveTaxRate = (
  productTaxRate: number | null | undefined,
  categoryTaxRate: number | null | undefined,
): number => productTaxRate ?? categoryTaxRate ?? DEFAULT_TAX_RATE;

export const taxOf = (netAmount: number, taxRate: number): number => Math.round((netAmount * taxRate) / 10000);

export const grossFromNet = (netAmount: number, taxRate: number): number => netAmount + taxOf(netAmount, taxRate);

export const toBasisPoints = (percentage: number): number => Math.round(percentage * 100);

export const toPercentage = (basisPoints: number): number => basisPoints / 100;

export enum AdjustmentType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export const asAdjustmentType = (type: string): AdjustmentType => {
  const types: AdjustmentType[] = Object.values(AdjustmentType);
  if (types.includes(type as AdjustmentType)) return type as AdjustmentType;
  return AdjustmentType.FIXED_AMOUNT;
};

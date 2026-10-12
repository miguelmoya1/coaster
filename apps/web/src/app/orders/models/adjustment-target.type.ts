export enum AdjustmentTarget {
  ORDER = 'ORDER',
  ITEM = 'ITEM',
}

export const asAdjustmentTarget = (target: string): AdjustmentTarget => {
  const targets: AdjustmentTarget[] = Object.values(AdjustmentTarget);
  if (targets.includes(target as AdjustmentTarget)) return target as AdjustmentTarget;
  return AdjustmentTarget.ORDER;
};

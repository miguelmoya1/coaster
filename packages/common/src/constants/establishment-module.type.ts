export const EstablishmentModule = {
  TIME_TRACKING: 'TIME_TRACKING',
  ORDERS: 'ORDERS',
  INVENTORY: 'INVENTORY',
} as const;

export type EstablishmentModule = (typeof EstablishmentModule)[keyof typeof EstablishmentModule];

/**
 * What a new establishment starts with until it is asked. Everything, because every establishment
 * that exists today is a bar and narrowing it silently would take features away from the next one.
 */
export const DEFAULT_ESTABLISHMENT_MODULES: EstablishmentModule[] = [
  EstablishmentModule.TIME_TRACKING,
  EstablishmentModule.ORDERS,
  EstablishmentModule.INVENTORY,
];

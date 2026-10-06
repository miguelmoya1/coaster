export const EstablishmentModule = {
  TIME_TRACKING: 'TIME_TRACKING',
  ORDERS: 'ORDERS',
  INVENTORY: 'INVENTORY',
} as const;

export type EstablishmentModule = (typeof EstablishmentModule)[keyof typeof EstablishmentModule];

export const DEFAULT_ESTABLISHMENT_MODULES: EstablishmentModule[] = [
  EstablishmentModule.TIME_TRACKING,
  EstablishmentModule.ORDERS,
  EstablishmentModule.INVENTORY,
];

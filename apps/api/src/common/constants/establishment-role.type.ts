export const EstablishmentRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

export type EstablishmentRole = (typeof EstablishmentRole)[keyof typeof EstablishmentRole];

export const BarRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

export type BarRole = (typeof BarRole)[keyof typeof BarRole];

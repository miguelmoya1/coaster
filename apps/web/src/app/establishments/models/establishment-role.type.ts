export const EstablishmentRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
} as const;

export type EstablishmentRole = (typeof EstablishmentRole)[keyof typeof EstablishmentRole];

export const asEstablishmentRole = (role: string): EstablishmentRole => {
  const roles: EstablishmentRole[] = Object.values(EstablishmentRole);
  if (roles.includes(role as EstablishmentRole)) return role as EstablishmentRole;
  return EstablishmentRole.STAFF;
};

export enum BarRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export const asBarRole = (role: string): BarRole => {
  if (Object.values(BarRole).includes(role as BarRole)) {
    return role as BarRole;
  }
  console.warn(`Invalid BarRole mapping: ${role}, defaulting to STAFF`);
  return BarRole.STAFF;
};

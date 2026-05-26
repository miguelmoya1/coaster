export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export const asRole = (role: string): Role => {
  if (Object.values(Role).includes(role as Role)) {
    return role as Role;
  }
  console.warn(`Invalid Role mapping: ${role}, defaulting to USER`);
  return Role.USER;
};

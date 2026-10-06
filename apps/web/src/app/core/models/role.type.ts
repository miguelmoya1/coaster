export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const asRole = (role: string): Role => {
  const roles: Role[] = Object.values(Role);
  if (roles.includes(role as Role)) return role as Role;
  return Role.USER;
};

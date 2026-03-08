import { Brand } from './brand.type';
import { UserRole } from './enums';

export type UserId = Brand<string, 'UserId'>;

export const asUserId = (id: string): UserId => id as UserId;

export const asUserRole = (role: string): UserRole => {
  if (Object.values(UserRole).includes(role as UserRole)) {
    return role as UserRole;
  }
  console.warn(`Invalid UserRole mapping: ${role}, defaulting to STAFF`);
  return UserRole.STAFF;
};

export interface User {
  id: UserId;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface LoginDto {
  email: string;
  pin: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  pin: string;
  role: UserRole;
}

export interface CurrentUserLogged {
  id: UserId;
  email: string;
  sub: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

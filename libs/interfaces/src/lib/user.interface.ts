import { Brand } from './brand.type';
import { UserRole } from './enums';

export type UserId = Brand<string, 'UserId'>;

export const asUserId = (id: string): UserId => id as UserId;

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

export type CurrentUserLogged = {
  id: UserId;
  email: string;
  sub: string;
} | null;

export interface AuthResponse {
  user: User;
  accessToken: string;
}

import type { Brand } from './brand.type';
import { Role } from './role.type';

export type UserId = Brand<string, 'UserId'>;

export interface User {
  id: UserId;
  email: string;
  name: string;
  active: boolean;
  photoUrl?: string;
  role: Role;
  language: string;
  emailVerified: boolean;
}

export interface UpdateUserDto {
  name?: string;
  photoUrl?: string;
  language?: string;
}

export const asUserId = (id: string): UserId => id as UserId;

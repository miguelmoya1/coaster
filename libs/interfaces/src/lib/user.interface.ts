import { Brand } from './brand.type';

export type UserId = Brand<string, 'UserId'>;

export const asUserId = (id: string): UserId => id as UserId;

export interface User {
  id: UserId;
  email: string;
  name: string;
  googleId?: string;
  active: boolean;
}

export interface CreateUserDto {
  name: string;
  email: string;
  googleId?: string;
}

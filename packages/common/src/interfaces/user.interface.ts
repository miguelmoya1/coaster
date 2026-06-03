import { Role } from '../constants/role.type';
import { Brand } from './brand.type';

export type UserId = Brand<string, 'UserId'>;

export interface User {
  id: UserId;
  email: string;
  name: string;
  googleId?: string;
  active: boolean;
  photoUrl?: string;
  role: Role;
}

export interface CreateUserDto {
  name: string;
  email: string;
  photoUrl?: string;
  googleId?: string;
}

export interface UpdateUserDto {
  name?: string;
  photoUrl?: string;
}

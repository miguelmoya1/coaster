import { Role } from '../constants/role.type';
import { Brand } from './brand.type';

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

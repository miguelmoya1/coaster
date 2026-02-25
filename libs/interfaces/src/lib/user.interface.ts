import { UserRole } from './enums';

export interface User {
  id: string;
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

export interface AuthResponse {
  user: User;
  accessToken: string;
}

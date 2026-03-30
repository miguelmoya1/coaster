import { Brand } from './brand.type';
import { BarRole } from './enums';
import { User, UserId } from './user.interface';

export type BarId = Brand<string, 'BarId'>;
export type BarMemberId = Brand<string, 'BarMemberId'>;

export const asBarId = (id: string): BarId => id as BarId;
export const asBarMemberId = (id: string): BarMemberId => id as BarMemberId;

export interface Bar {
  id: BarId;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BarMember {
  id: BarMemberId;
  userId: UserId;
  barId: BarId;
  role: BarRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;

  userName: string;
  userImage: string;
  userEmail: string;
}

export interface CreateBarDto {
  name: string;
}

export interface InviteBarMemberDto {
  email: string;
  role?: BarRole;
}

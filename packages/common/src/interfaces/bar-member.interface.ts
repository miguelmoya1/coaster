import { BarPermissionType } from '../constants/bar-permissions.enum';
import { BarRole } from '../constants/bar-role.enum';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type BarMemberId = Brand<string, 'BarMemberId'>;

export const asBarMemberId = (id: string): BarMemberId => id as BarMemberId;

export interface BarMember {
  id: BarMemberId;
  userId: UserId;
  barId: BarId;
  role: BarRole;
  permissions: BarPermissionType[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;

  userName: string;
  userImage: string;
  userEmail: string;
}

export interface InviteBarMemberDto {
  email: string;
  role?: BarRole;
}

import { BarPermissionType } from '../constants/bar-permissions.type';
import { BarRole } from '../constants/bar-role.type';
import { BarId } from './bar.interface';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type BarMemberId = Brand<string, 'BarMemberId'>;

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

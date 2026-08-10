import { EstablishmentPermissionType } from '../constants/establishment-permissions.type';
import { EstablishmentRole } from '../constants/establishment-role.type';
import { EstablishmentId } from './establishment.interface';
import { Brand } from './brand.type';
import { UserId } from './user.interface';

export type EstablishmentMemberId = Brand<string, 'EstablishmentMemberId'>;

export interface EstablishmentMember {
  id: EstablishmentMemberId;
  userId: UserId;
  establishmentId: EstablishmentId;
  role: EstablishmentRole;
  permissions: EstablishmentPermissionType[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;

  userName: string;
  userImage: string;
  userEmail: string;
}

export interface InviteEstablishmentMemberDto {
  email: string;
  role?: EstablishmentRole;
}

export interface UpdateEstablishmentMemberRoleDto {
  role: EstablishmentRole;
}

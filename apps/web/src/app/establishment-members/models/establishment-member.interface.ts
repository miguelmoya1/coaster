import type { EstablishmentId, Brand, UserId } from '@coaster/core';
import { EstablishmentRole } from '@coaster/establishments';

export type EstablishmentMemberId = Brand<string, 'EstablishmentMemberId'>;

export interface EstablishmentMember {
  id: EstablishmentMemberId;
  userId: UserId;
  establishmentId: EstablishmentId;
  role: EstablishmentRole;
  active: boolean;
  pending?: boolean;
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

export const asEstablishmentMemberId = (id: string): EstablishmentMemberId => id as EstablishmentMemberId;

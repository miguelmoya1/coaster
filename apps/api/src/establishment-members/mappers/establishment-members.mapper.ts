import type { EstablishmentMember } from '@coaster/common';
import {
  asEstablishmentId,
  asEstablishmentMemberId,
  asEstablishmentRole,
  asUserId,
  getRolePermissions,
} from '@coaster/common';

export const isInvitePending = (user: { passwordUpdatedAt?: Date | null; _count?: { identities: number } }): boolean =>
  !user.passwordUpdatedAt && (user._count?.identities ?? 0) === 0;

export const EstablishmentMembersMapper = {
  toDomain(member: {
    id: string;
    userId: string;
    establishmentId: string;
    role: string;
    active: boolean;
    user: {
      name: string;
      photoUrl: string | null;
      email: string;
      passwordUpdatedAt?: Date | null;
      _count?: { identities: number };
    };
  }): EstablishmentMember {
    const role = asEstablishmentRole(member.role);
    return {
      id: asEstablishmentMemberId(member.id),
      userId: asUserId(member.userId),
      establishmentId: asEstablishmentId(member.establishmentId),
      role,
      permissions: getRolePermissions(role),
      active: member.active,
      pending: isInvitePending(member.user),
      userName: member.user.name,
      userImage: member.user.photoUrl ?? '',
      userEmail: member.user.email,
    };
  },

  toDto(domainEntity: EstablishmentMember): EstablishmentMember {
    return domainEntity;
  },
};

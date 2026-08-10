import type { EstablishmentMember } from '@coaster/common';
import {
  asEstablishmentId,
  asEstablishmentMemberId,
  asEstablishmentRole,
  asUserId,
  getRolePermissions,
} from '@coaster/common';

export const EstablishmentMembersMapper = {
  toDomain(member: {
    id: string;
    userId: string;
    establishmentId: string;
    role: string;
    active: boolean;
    user: { name: string; photoUrl: string | null; email: string };
  }): EstablishmentMember {
    const role = asEstablishmentRole(member.role);
    return {
      id: asEstablishmentMemberId(member.id),
      userId: asUserId(member.userId),
      establishmentId: asEstablishmentId(member.establishmentId),
      role,
      permissions: getRolePermissions(role),
      active: member.active,
      userName: member.user.name,
      userImage: member.user.photoUrl ?? '',
      userEmail: member.user.email,
    };
  },

  toDto(domainEntity: EstablishmentMember): EstablishmentMember {
    return domainEntity;
  },
};

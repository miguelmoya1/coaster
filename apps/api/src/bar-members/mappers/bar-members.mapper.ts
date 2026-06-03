import type { BarMember } from '@coaster/common';
import { asBarId, asBarMemberId, asBarRole, asUserId, getRolePermissions } from '../../core';

export const BarMembersMapper = {
  toDomain(member: {
    id: string;
    userId: string;
    barId: string;
    role: string;
    active: boolean;
    user: { name: string; photoUrl: string | null; email: string };
  }): BarMember {
    const role = asBarRole(member.role);
    return {
      id: asBarMemberId(member.id),
      userId: asUserId(member.userId),
      barId: asBarId(member.barId),
      role,
      permissions: getRolePermissions(role),
      active: member.active,
      userName: member.user.name,
      userImage: member.user.photoUrl ?? '',
      userEmail: member.user.email,
    };
  },

  toDto(domainEntity: BarMember): BarMember {
    return domainEntity;
  },
};

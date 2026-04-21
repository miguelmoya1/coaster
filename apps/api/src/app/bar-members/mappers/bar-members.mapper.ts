import { asBarId, asBarMemberId, asBarRole, asUserId, BarMember } from '@coaster/interfaces';

export const BarMembersMapper = {
  toDomain(member: {
    id: string;
    userId: string;
    barId: string;
    role: string;
    active: boolean;
    user: { name: string; photoUrl: string | null; email: string };
  }): BarMember {
    return {
      id: asBarMemberId(member.id),
      userId: asUserId(member.userId),
      barId: asBarId(member.barId),
      role: asBarRole(member.role),
      active: member.active,
      userName: member.user.name,
      userImage: member.user.photoUrl ?? undefined,
      userEmail: member.user.email,
    };
  },

  toDto(domainEntity: BarMember): BarMember {
    return domainEntity;
  },
};

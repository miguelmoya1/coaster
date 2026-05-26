import { asUserId, User, Role } from '@coaster/common';

import { User as UserDb } from '../../core';

export const UsersMapper = {
  toDomain(dbUser: UserDb): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      googleId: dbUser.googleId ?? undefined,
      photoUrl: dbUser.photoUrl ?? undefined,
      active: dbUser.active,
      role: dbUser.role as Role,
    };
  },

  toDto(domainEntity: User): User {
    return domainEntity;
  },
};

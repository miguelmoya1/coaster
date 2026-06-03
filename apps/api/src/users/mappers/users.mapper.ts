import type { Role, User } from '@coaster/common';
import { asUserId, DbUser } from '../../core';

export const UsersMapper = {
  toDomain(dbUser: DbUser): User {
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

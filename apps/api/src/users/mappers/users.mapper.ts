import type { User } from '@coaster/common';
import { asUserId } from '../../core';
import type { DbUser } from '../../core/db';

export const UsersMapper = {
  toDomain(dbUser: DbUser): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      googleId: dbUser.googleId ?? undefined,
      photoUrl: dbUser.photoUrl ?? undefined,
      active: dbUser.active,
      role: dbUser.role,
      language: dbUser.language,
    };
  },

  toDto(domainEntity: User): User {
    return domainEntity;
  },
};

import type { User } from '@coaster/common';
import { asUserId } from '@coaster/common';
import type { DbUser } from '@coaster/core/db';

export const UsersMapper = {
  toDomain(dbUser: DbUser): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
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

import type { User } from '@coaster/common';
import { asUserId } from '@coaster/common';
import type { DbUser, DbUserPreferences } from '@coaster/core/db';

export type DbUserWithPreferences = DbUser & { preferences: DbUserPreferences | null };

export type DbUserWithoutPassword = Omit<DbUserWithPreferences, 'passwordHash'>;

export const UsersMapper = {
  toDomain(dbUser: DbUserWithoutPassword): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      photoUrl: dbUser.photoUrl ?? undefined,
      active: dbUser.active,
      role: dbUser.role,
      language: dbUser.preferences?.language ?? 'es',
      emailVerified: dbUser.emailVerifiedAt !== null,
    };
  },

  toDto(domainEntity: User): User {
    return domainEntity;
  },
};

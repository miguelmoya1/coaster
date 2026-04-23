import { asUserId, User } from '@coaster/interfaces';
import { resolveProfileImage, User as UserDb } from '../../core';

export const UsersMapper = {
  toDomain(dbUser: UserDb): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      googleId: dbUser.googleId ?? undefined,
      photoUrl: resolveProfileImage(dbUser.photoUrl, dbUser.name),
      active: dbUser.active,
    };
  },

  toDto(domainEntity: User): User {
    return domainEntity;
  },
};

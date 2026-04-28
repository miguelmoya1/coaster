import { User } from '@coaster/common';
import { prepareDefaultProfileImage } from '../utils/user.utils';

export type MappedUser = User & { photoUrl: string };

export const checkIsUser = (user: unknown): user is User => {
  return (
    typeof user === 'object' && user !== null && 'id' in user && 'email' in user && 'name' in user && 'active' in user
  );
};

export const userMapper = (user: unknown): MappedUser => {
  if (!checkIsUser(user)) {
    throw new Error('Invalid user');
  }

  const { id, email, name, active, photoUrl } = user;

  return {
    id,
    email,
    name,
    active,
    photoUrl: prepareDefaultProfileImage(photoUrl, name),
  };
};

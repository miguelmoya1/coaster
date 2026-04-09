import { User } from '@coaster/interfaces';

const checkIsUser = (user: unknown): user is User => {
  return (
    typeof user === 'object' && user !== null && 'id' in user && 'email' in user && 'name' in user && 'active' in user
  );
};

export const userMapper = (user: unknown): User => {
  if (!checkIsUser(user)) {
    throw new Error('Invalid user');
  }

  const { id, email, name, active } = user;

  return {
    id,
    email,
    name,
    active,
  };
};

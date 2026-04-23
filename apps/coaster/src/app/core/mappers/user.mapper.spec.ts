import { asUserId, User } from '@coaster/interfaces';
import { checkIsUser, userMapper } from './user.mapper';

describe('User Mapper', () => {
  const validUser: User = {
    id: asUserId('user-1'),
    email: 'test@example.com',
    name: 'Test User',
    active: true,
    photoUrl: 'https://photo.url/test.jpg',
  };

  describe('checkIsUser', () => {
    it('should return true for valid user', () => {
      expect(checkIsUser(validUser)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsUser(null)).toBe(false);
      expect(checkIsUser({ name: 'User' })).toBe(false);
      expect(checkIsUser({ id: '1', email: 'test@test.com' })).toBe(false);
    });
  });

  describe('userMapper', () => {
    it('should map a valid user', () => {
      expect(userMapper(validUser)).toEqual(validUser);
    });

    it('should throw Error for invalid user', () => {
      expect(() => userMapper({})).toThrow(Error);
      expect(() => userMapper(null)).toThrow(Error);
      expect(() => userMapper(undefined)).toThrow(Error);
      expect(() => userMapper({ id: '1' })).toThrow(Error);
      expect(() => userMapper({ name: 'User' })).toThrow(Error);
    });
  });
});

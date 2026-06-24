import type { User } from '@coaster/common';
import { asUserId, Role } from '@coaster/core';
import { describe, expect, it } from 'vitest';
import { checkIsUser, userMapper } from './user.mapper';

describe('User Mapper', () => {
  const validUser: User = {
    id: asUserId('user-1'),
    email: 'test@example.com',
    name: 'Test User',
    active: true,
    role: Role.USER,
    language: 'es',
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
      const result = userMapper(validUser);
      expect(result.id).toBe(validUser.id);
      expect(result.email).toBe(validUser.email);
      expect(result.name).toBe(validUser.name);
      expect(result.active).toBe(validUser.active);
      expect(result.photoUrl).toContain('ui-avatars.com');
    });

    it('should preserve existing photoUrl', () => {
      const userWithPhoto = { ...validUser, photoUrl: 'https://photo.url/test.jpg' };
      expect(userMapper(userWithPhoto).photoUrl).toBe('https://photo.url/test.jpg');
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

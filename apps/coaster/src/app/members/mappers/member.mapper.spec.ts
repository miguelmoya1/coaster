import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { checkIsMember, memberArrayMapper, memberMapper } from './member.mapper';

describe('Member Mapper', () => {
  const validMember: BarMember = {
    id: asBarMemberId('member-1'),
    userId: asUserId('user-1'),
    barId: asBarId('bar-1'),
    role: BarRole.OWNER,
    active: true,
    userName: 'John',
    userEmail: 'john@example.com',
    userImage: '',
  };

  describe('checkIsMember', () => {
    it('should return true for valid member', () => {
      expect(checkIsMember(validMember)).toBe(true);
    });
    it('should return false for invalid objects', () => {
      expect(checkIsMember(null)).toBe(false);
      expect(checkIsMember({ id: '1' })).toBe(false);
    });
  });

  describe('memberMapper', () => {
    it('should map a valid member', () => {
      expect(memberMapper(validMember)).toEqual(validMember);
    });
    it('should throw Error for invalid member', () => {
      expect(() => memberMapper({ id: '1' })).toThrow('Invalid Member payload');
    });
  });

  describe('memberArrayMapper', () => {
    it('should map an array of valid members', () => {
      expect(memberArrayMapper([validMember])).toEqual([validMember]);
    });
    it('should throw an error for non-array input', () => {
      expect(() => memberArrayMapper({})).toThrow('Expected array of Members');
    });
  });
});

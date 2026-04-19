import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { checkIsMember, memberArrayMapper, memberMapper } from './member.mapper';

describe('Member Mapper', () => {
  const validMember: BarMember = {
    id: asBarMemberId('member-1'),
    userId: asUserId('user-1'),
    barId: asBarId('bar-1'),
    role: BarRole.STAFF,
    active: true,
    userName: 'John Doe',
    userEmail: 'john@test.com',
    userImage: '',
  };

  describe('checkIsMember', () => {
    it('should return true for valid member', () => {
      expect(checkIsMember(validMember)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(checkIsMember(null)).toBe(false);
      expect(checkIsMember({})).toBe(false);
      expect(checkIsMember({ id: '1' })).toBe(false);
    });
  });

  describe('memberMapper', () => {
    it('should map a valid member', () => {
      expect(memberMapper(validMember)).toEqual(validMember);
    });

    it('should throw Error for invalid member', () => {
      expect(() => memberMapper({})).toThrow('Invalid Member payload');
    });
  });

  describe('memberArrayMapper', () => {
    it('should map valid array of members', () => {
      expect(memberArrayMapper([validMember])).toEqual([validMember]);
    });

    it('should return empty array for empty input', () => {
      expect(memberArrayMapper([])).toEqual([]);
    });

    it('should throw Error if input is not an array', () => {
      expect(() => memberArrayMapper({})).toThrow('Expected array of Members');
    });
  });
});

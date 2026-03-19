import { BarMember } from '@coaster/interfaces';

export const checkIsMember = (member: unknown): member is BarMember => {
  return (
    typeof member === 'object' &&
    member !== null &&
    'id' in member &&
    'role' in member &&
    'userId' in member &&
    'barId' in member
  );
};

export const memberMapper = (member: unknown): BarMember => {
  if (!checkIsMember(member)) {
    throw new Error('Invalid Member payload');
  }
  return { ...member };
};

export const memberArrayMapper = (members: unknown): BarMember[] => {
  if (!Array.isArray(members)) throw new Error('Expected array of Members');
  return members.map(memberMapper);
};

import type { EstablishmentMember } from '@coaster/common';
import { prepareDefaultProfileImage } from '@coaster/core';

export const checkIsMember = (member: unknown): member is EstablishmentMember => {
  return (
    typeof member === 'object' &&
    member !== null &&
    'id' in member &&
    'role' in member &&
    'userId' in member &&
    'establishmentId' in member
  );
};

export const memberMapper = (member: unknown): EstablishmentMember => {
  if (!checkIsMember(member)) {
    throw new Error('Invalid Member payload');
  }
  return {
    ...member,
    userImage: prepareDefaultProfileImage(member.userImage, member.userName),
  };
};

export const memberArrayMapper = (members: unknown): EstablishmentMember[] => {
  if (!Array.isArray(members)) throw new Error('Expected array of Members');
  return members.map(memberMapper);
};

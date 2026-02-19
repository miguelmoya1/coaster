import { randomBytes } from 'node:crypto';

export const generateStaffUid = () => {
  return `staff_${randomBytes(4).toString('hex')}`;
};

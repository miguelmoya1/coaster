import type { EstablishmentMember } from '@coaster/common';
import { EstablishmentRole } from '@coaster/common';

export const isOnlyOwner = (members: EstablishmentMember[]): boolean =>
  members.filter((member) => member.role === EstablishmentRole.OWNER).length === 1;

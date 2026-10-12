import type { EstablishmentMember } from '../models/establishment-member.interface';
import { EstablishmentRole } from '@coaster/establishments';

export const isOnlyOwner = (members: EstablishmentMember[]): boolean =>
  members.filter((member) => member.role === EstablishmentRole.OWNER).length === 1;

import type { EstablishmentId } from '@coaster/common';
import { EstablishmentRole } from '@coaster/common';

export class PrepareUserForInviteCommand {
  constructor(
    public readonly email: string,
    public readonly extraData: {
      readonly establishmentId: EstablishmentId;
      readonly role?: EstablishmentRole;
      readonly inviterLanguage: string;
    },
  ) {}
}

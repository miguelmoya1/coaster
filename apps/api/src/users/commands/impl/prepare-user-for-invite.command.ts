import type { BarId } from '@coaster/common';
import { BarRole } from '@coaster/common';

export class PrepareUserForInviteCommand {
  constructor(
    public readonly email: string,
    public readonly extraData: { readonly barId: BarId; readonly role?: BarRole; readonly inviterLanguage: string },
  ) {}
}

import type { BetaTesterId, User } from '@coaster/common';

export class RemoveBetaTesterCommand {
  constructor(
    public readonly betaTesterId: BetaTesterId,
    public readonly actor: User,
  ) {}
}

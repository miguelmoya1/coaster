import type { DbAuthProvider } from '@coaster/core/db';

export class UnlinkIdentityCommand {
  constructor(
    public readonly userId: string,
    public readonly provider: DbAuthProvider,
  ) {}
}

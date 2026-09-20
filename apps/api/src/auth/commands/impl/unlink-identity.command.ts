import type { DbAuthProvider } from '@coaster/core/db';
import type { SessionOrigin } from '../../services/session.service';

export class UnlinkIdentityCommand {
  constructor(
    public readonly userId: string,
    public readonly provider: DbAuthProvider,
    public readonly origin: SessionOrigin = {},
  ) {}
}

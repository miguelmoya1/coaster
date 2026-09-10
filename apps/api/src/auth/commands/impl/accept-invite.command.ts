import type { SessionOrigin } from '../../services/session.service';

export class AcceptInviteCommand {
  constructor(
    public readonly token: string,
    public readonly password: string,
    public readonly origin: SessionOrigin,
  ) {}
}

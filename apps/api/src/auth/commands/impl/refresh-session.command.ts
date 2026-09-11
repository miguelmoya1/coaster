import type { SessionOrigin } from '../../services/session.service';

export class RefreshSessionCommand {
  constructor(
    public readonly refreshToken: string | undefined,
    public readonly origin: SessionOrigin,
  ) {}
}

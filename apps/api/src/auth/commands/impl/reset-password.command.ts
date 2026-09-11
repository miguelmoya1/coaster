import type { SessionOrigin } from '../../services/session.service';

export class ResetPasswordCommand {
  constructor(
    public readonly token: string,
    public readonly password: string,
    public readonly origin: SessionOrigin,
  ) {}
}

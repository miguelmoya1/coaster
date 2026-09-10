import type { SessionOrigin } from '../../services/session.service';

export class LoginWithPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly origin: SessionOrigin,
  ) {}
}

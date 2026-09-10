import type { SessionOrigin } from '../../services/session.service';

export class LoginWithGoogleCommand {
  constructor(
    public readonly credential: string,
    public readonly origin: SessionOrigin,
  ) {}
}

import type { SessionOrigin } from '../../services/session.service';

export class RegisterCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    public readonly language: string | undefined,
    public readonly origin: SessionOrigin,
  ) {}
}

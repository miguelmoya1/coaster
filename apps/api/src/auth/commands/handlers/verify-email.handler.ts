import { ErrorCodes } from '@coaster/common';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { VerifyEmailCommand } from '../impl/verify-email.command';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand, void> {
  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const token = await this._tokens.findUsable(command.token, DbAuthTokenPurpose.EMAIL_VERIFICATION);

    if (!token || !(await this._tokens.spend(token.id))) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    await this._users.update(token.userId, { emailVerifiedAt: token.user.emailVerifiedAt ?? new Date() });
  }
}

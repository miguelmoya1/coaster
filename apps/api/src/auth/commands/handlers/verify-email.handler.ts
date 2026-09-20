import { ErrorCodes } from '@coaster/common';
import { DbAuthEventType, DbAuthTokenPurpose } from '@coaster/core/db';
import { BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { AuthEventOccurred } from '../../events/impl/auth-event.event';
import { VerifyEmailCommand } from '../impl/verify-email.command';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand, void> {
  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
    private readonly _events: EventBus,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const token = await this._tokens.findUsable(command.token, DbAuthTokenPurpose.EMAIL_VERIFICATION);

    if (!token || !(await this._tokens.spend(token.id))) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    await this._users.update(token.userId, { emailVerifiedAt: token.user.emailVerifiedAt ?? new Date() });

    this._events.publish(
      new AuthEventOccurred({
        type: DbAuthEventType.EMAIL_VERIFIED,
        userId: token.userId,
        email: token.user.email,
      }),
    );
  }
}

import { ErrorCodes } from '@coaster/common';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { AuthUserRepository } from '../../data-access/auth-user.repository';
import { hashPassword } from '../../domain/password';
import { IssuedSession, SessionService } from '../../services/session.service';
import { AcceptInviteCommand } from '../impl/accept-invite.command';

@CommandHandler(AcceptInviteCommand)
export class AcceptInviteHandler implements ICommandHandler<AcceptInviteCommand, IssuedSession> {
  constructor(
    private readonly _users: AuthUserRepository,
    private readonly _tokens: AuthTokenRepository,
    private readonly _session: SessionService,
  ) {}

  async execute(command: AcceptInviteCommand): Promise<IssuedSession> {
    const token = await this._tokens.findUsable(command.token, DbAuthTokenPurpose.INVITE);

    if (!token || !(await this._tokens.spend(token.id))) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    if (!token.user.active) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    if (token.user.passwordHash) {
      throw new BadRequestException(ErrorCodes.PASSWORD_ALREADY_SET);
    }

    const user = await this._users.update(token.userId, {
      passwordHash: await hashPassword(command.password),
      passwordUpdatedAt: new Date(),
      emailVerifiedAt: token.user.emailVerifiedAt ?? new Date(),
    });

    return this._session.issue(user, command.origin);
  }
}

import { AuthTokenRepository } from '@coaster/auth';
import { ErrorCodes } from '@coaster/common';
import { AUTH_MAILER, type AuthMailer } from '@coaster/core';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { ConflictException, Inject, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { isInvitePending } from '../../mappers/establishment-members.mapper';
import { ResendInviteCommand } from '../impl/resend-invite.command';

@CommandHandler(ResendInviteCommand)
export class ResendInviteHandler implements ICommandHandler<ResendInviteCommand, void> {
  readonly #logger = new Logger(ResendInviteHandler.name);

  constructor(
    private readonly repository: EstablishmentMembersReadRepository,
    private readonly tokens: AuthTokenRepository,
    @Inject(AUTH_MAILER) private readonly mailer: AuthMailer,
  ) {}

  async execute(command: ResendInviteCommand) {
    this.#logger.debug(`Executing resendInvite...`);
    const { establishmentId, memberId, user } = command;

    const member = await this.repository.getMemberById(establishmentId, memberId);

    if (!member || !member.user.active) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (!isInvitePending(member.user)) {
      throw new ConflictException(ErrorCodes.INVITE_ALREADY_ACCEPTED);
    }

    const token = await this.tokens.issue(member.userId, DbAuthTokenPurpose.INVITE);

    try {
      await this.mailer.sendInvite(
        member.user.email,
        { establishmentName: member.establishment.name, inviterName: user.name, token },
        user.language,
      );
    } catch (error) {
      this.#logger.error(
        `The invitation to ${member.user.email} for ${member.establishment.name} did not leave again: ${(error as Error).message}`,
      );

      throw new ServiceUnavailableException(ErrorCodes.INVITE_EMAIL_FAILED);
    }

    this.#logger.debug(`Sent a fresh invitation to ${member.user.email}`);
  }
}

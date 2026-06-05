import { ConflictException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { PrepareUserForInviteEvent } from '../../../events';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { PrepareInviteMemberCommand } from './prepare-invite-member.command';

@CommandHandler(PrepareInviteMemberCommand)
export class PrepareInviteMemberHandler implements ICommandHandler<PrepareInviteMemberCommand, void> {
  readonly #logger = new Logger(PrepareInviteMemberHandler.name);

  constructor(
    private readonly repository: BarMembersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PrepareInviteMemberCommand) {
    this.#logger.debug(`Executing prepareInviteMember...`);
    const { barId, email, role } = command;
    const existingMember = await this.repository.isMember(barId, email);

    if (existingMember) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
    }

    this.#logger.debug(`Publishing PrepareUserForInviteEvent...`);
    await this.eventBus.publish(new PrepareUserForInviteEvent(barId, email, role));
  }
}

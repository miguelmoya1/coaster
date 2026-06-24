import { ConflictException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { InviteMemberRequestedEvent } from '../../events';
import { InviteMemberCommand } from '../impl/invite-member.command';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, void> {
  readonly #logger = new Logger(InviteMemberHandler.name);

  constructor(
    private readonly repository: BarMembersReadRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand) {
    this.#logger.debug(`Executing inviteMember...`);
    const { barId, email, role } = command;
    const existingMember = await this.repository.isMember(barId, email);

    if (existingMember) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
    }

    this.#logger.debug(`Publishing InviteMemberRequestedEvent...`);
    await this.eventBus.publish(new InviteMemberRequestedEvent(barId, email, role, command.user.language));
  }
}

import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes, PrepareUserForInviteEvent } from '../../../core';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { PrepareInviteMemberCommand } from './prepare-invite-member.command';

@CommandHandler(PrepareInviteMemberCommand)
export class PrepareInviteMemberHandler implements ICommandHandler<PrepareInviteMemberCommand, void> {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PrepareInviteMemberCommand) {
    const { barId, email, role } = command;
    const existingMember = await this.repository.isMember(barId, email);

    if (existingMember) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
    }

    await this.eventBus.publish(new PrepareUserForInviteEvent(barId, email, role));
  }
}

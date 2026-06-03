import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UserInvitedEvent } from '../../../core';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { InviteMemberCommand } from './invite-member.command';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, void> {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand) {
    const { barId, userId, role } = command;

    const response = await this.repository.inviteMember(barId, userId, { role });

    this.eventBus.publish(new UserInvitedEvent(response.user.name, response.user.email, response.bar.name));
  }
}

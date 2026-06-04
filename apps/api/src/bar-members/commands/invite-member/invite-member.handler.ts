import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UserInvitedEvent } from '../../../events';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { InviteMemberCommand } from './invite-member.command';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, void> {
  readonly #logger = new Logger(InviteMemberHandler.name);

  constructor(
    private readonly repository: BarMembersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand) {
    this.#logger.debug(`Executing inviteMember...`);

    const { barId, userId, role } = command;

    const response = await this.repository.inviteMember(barId, userId, { role });

    this.#logger.debug(`Publishing UserInvitedEvent...`);
    this.eventBus.publish(new UserInvitedEvent(response.user.name, response.user.email, response.bar.name));
  }
}

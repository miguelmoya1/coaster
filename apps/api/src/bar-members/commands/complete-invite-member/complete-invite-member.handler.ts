import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { asBarMemberId } from '../../../core';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { MemberInvitedEvent } from '../../events';
import { CompleteInviteMemberCommand } from './complete-invite-member.command';

@CommandHandler(CompleteInviteMemberCommand)
export class CompleteInviteMemberHandler implements ICommandHandler<CompleteInviteMemberCommand, void> {
  readonly #logger = new Logger(CompleteInviteMemberHandler.name);

  constructor(
    private readonly repository: BarMembersWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteInviteMemberCommand) {
    this.#logger.debug(`Executing completeInviteMember...`);

    const { barId, userId, role } = command;

    const response = await this.repository.invite(barId, userId, { role });

    this.#logger.debug(`Publishing MemberInvitedEvent...`);
    this.eventBus.publish(
      new MemberInvitedEvent(
        barId,
        asBarMemberId(response.id),
        response.user.email,
        response.bar.name,
        response.user.name,
        command.inviterLanguage,
      ),
    );
  }
}

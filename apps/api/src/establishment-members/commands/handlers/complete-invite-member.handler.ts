import { asEstablishmentMemberId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentMembersWriteRepository } from '../../data-access/establishment-members.write.repository';
import { MemberInvitedEvent } from '../../events';
import { CompleteInviteMemberCommand } from '../impl/complete-invite-member.command';

@CommandHandler(CompleteInviteMemberCommand)
export class CompleteInviteMemberHandler implements ICommandHandler<CompleteInviteMemberCommand, void> {
  readonly #logger = new Logger(CompleteInviteMemberHandler.name);

  constructor(
    private readonly repository: EstablishmentMembersWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteInviteMemberCommand) {
    this.#logger.debug(`Executing completeInviteMember...`);

    const { establishmentId, userId, role } = command;

    const response = await this.repository.invite(establishmentId, userId, { role });

    this.#logger.debug(`Publishing MemberInvitedEvent...`);
    this.eventBus.publish(
      new MemberInvitedEvent(
        establishmentId,
        asEstablishmentMemberId(response.id),
        response.user.email,
        response.establishment.name,
        response.user.name,
        command.inviterLanguage,
      ),
    );
  }
}

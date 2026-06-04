import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { MemberRemovedEvent } from '../../../events';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { RemoveMemberCommand } from './remove-member.command';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  readonly #logger = new Logger(RemoveMemberHandler.name);

  constructor(
    private readonly repository: BarMembersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    this.#logger.debug(`Executing removeMember...`);
    const { barId, memberId } = command;

    const members = await this.repository.getMembersByBar(barId);
    const memberToRemove = members.find((m) => m.id === memberId);

    if (memberToRemove?.role === 'OWNER') {
      const ownerCount = members.filter((m) => m.role === 'OWNER').length;
      if (ownerCount <= 1) {
        throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
      }
    }

    await this.repository.removeMember(memberId);
    this.#logger.debug(`Publishing MemberRemovedEvent...`);
    this._eventBus.publish(new MemberRemovedEvent(barId, memberId));
  }
}

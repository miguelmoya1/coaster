import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { MemberRemovedEvent } from '../../../events';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { RemoveMemberCommand } from './remove-member.command';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  readonly #logger = new Logger(RemoveMemberHandler.name);

  constructor(
    private readonly readRepo: BarMembersReadRepository,
    private readonly writeRepo: BarMembersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    this.#logger.debug(`Executing removeMember...`);
    const { barId, memberId } = command;

    const members = await this.readRepo.getMembersByBar(barId);
    const memberToRemove = members.find((m) => m.id === memberId);

    if (memberToRemove?.role === 'OWNER') {
      const ownerCount = members.filter((m) => m.role === 'OWNER').length;
      if (ownerCount <= 1) {
        throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
      }
    }

    const removed = await this.writeRepo.delete(barId, memberId);

    if (!removed) {
      this.#logger.warn(`Member not found or not belonging to bar`, { barId, memberId });
      throw new BadRequestException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    this.#logger.debug(`Publishing MemberRemovedEvent...`);
    this._eventBus.publish(new MemberRemovedEvent(barId, memberId));
  }
}

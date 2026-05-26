import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { RemoveMemberCommand } from './remove-member.command';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { MemberRemovedEvent } from '../../events';
import { BarRole, ErrorCodes } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    const members = await this.repository.getMembersByBar(command.barId);
    const memberToRemove = members.find((m) => m.id === command.memberId);

    if (memberToRemove?.role === BarRole.OWNER) {
      const ownerCount = members.filter((m) => m.role === BarRole.OWNER).length;
      if (ownerCount <= 1) {
        throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
      }
    }

    await this.repository.removeMember(command.memberId);
    this._eventBus.publish(new MemberRemovedEvent(command.barId, command.memberId));
  }
}

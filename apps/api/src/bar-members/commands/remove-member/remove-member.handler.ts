import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveMemberCommand } from './remove-member.command';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { BarGateway } from '../../../core';
import { BarRole, ErrorCodes, SocketEvents } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  constructor(
    private readonly repository: BarMembersRepository,
    private readonly _barGateway: BarGateway,
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
    this._barGateway.server.to(command.barId).emit(SocketEvents.MEMBER_REMOVED, { id: command.memberId });
  }
}

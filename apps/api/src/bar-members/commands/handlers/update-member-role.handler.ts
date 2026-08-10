import { BarRole, ErrorCodes, asUserId } from '@coaster/common';
import type { DbBarRole } from '@coaster/core/db';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { BarMembersWriteRepository } from '../../data-access/bar-members.write.repository';
import { MemberRoleChangedEvent } from '../../events';
import { UpdateMemberRoleCommand } from '../impl/update-member-role.command';

@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleHandler implements ICommandHandler<UpdateMemberRoleCommand, void> {
  readonly #logger = new Logger(UpdateMemberRoleHandler.name);

  constructor(
    private readonly readRepo: BarMembersReadRepository,
    private readonly writeRepo: BarMembersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<void> {
    const { barId, memberId, role, actor } = command;

    const members = await this.readRepo.getMembersByBar(barId);
    const member = members.find((m) => m.id === memberId);

    if (!member) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (member.role === role) {
      return;
    }

    if (member.role === BarRole.OWNER && members.filter((m) => m.role === BarRole.OWNER).length <= 1) {
      throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
    }

    const updated = await this.writeRepo.updateRole(barId, memberId, role as DbBarRole);

    if (!updated) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    this.#logger.debug(`Member ${memberId} moved from ${member.role} to ${role} on bar ${barId}`);

    this._eventBus.publish(
      new MemberRoleChangedEvent(barId, memberId, asUserId(member.userId), member.role, role, actor.id, actor.role),
    );
  }
}

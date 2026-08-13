import { EstablishmentRole, ErrorCodes, asUserId } from '@coaster/common';
import type { DbEstablishmentRole } from '@coaster/core/db';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { EstablishmentMembersWriteRepository } from '../../data-access/establishment-members.write.repository';
import { MemberRoleChangedEvent } from '../../events';
import { UpdateMemberRoleCommand } from '../impl/update-member-role.command';

@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleHandler implements ICommandHandler<UpdateMemberRoleCommand, void> {
  readonly #logger = new Logger(UpdateMemberRoleHandler.name);

  constructor(
    private readonly readRepo: EstablishmentMembersReadRepository,
    private readonly writeRepo: EstablishmentMembersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<void> {
    const { establishmentId, memberId, role, actor } = command;

    const members = await this.readRepo.getMembersByEstablishment(establishmentId);
    const member = members.find((m) => m.id === memberId);

    if (!member) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (member.role === role) {
      return;
    }

    if (
      member.role === EstablishmentRole.OWNER &&
      members.filter((m) => m.role === EstablishmentRole.OWNER).length <= 1
    ) {
      throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
    }

    const updated = await this.writeRepo.updateRole(establishmentId, memberId, role as DbEstablishmentRole);

    if (!updated) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    this.#logger.debug(`Member ${memberId} moved from ${member.role} to ${role} on establishment ${establishmentId}`);

    this._eventBus.publish(
      new MemberRoleChangedEvent(
        establishmentId,
        memberId,
        asUserId(member.userId),
        member.role,
        role,
        actor.id,
        actor.role,
      ),
    );
  }
}

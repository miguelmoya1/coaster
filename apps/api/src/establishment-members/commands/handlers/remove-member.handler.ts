import { EstablishmentRole, ErrorCodes, asUserId } from '@coaster/common';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { EstablishmentMembersWriteRepository } from '../../data-access/establishment-members.write.repository';
import { MemberRemovedEvent } from '../../events';
import { RemoveMemberCommand } from '../impl/remove-member.command';

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  readonly #logger = new Logger(RemoveMemberHandler.name);

  constructor(
    private readonly readRepo: EstablishmentMembersReadRepository,
    private readonly writeRepo: EstablishmentMembersWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    this.#logger.debug(`Executing removeMember...`);
    const { establishmentId, memberId } = command;

    const members = await this.readRepo.getMembersByEstablishment(establishmentId);
    const memberToRemove = members.find((m) => m.id === memberId);

    if (!memberToRemove) {
      this.#logger.warn(`Member not found or not belonging to establishment`, { establishmentId, memberId });
      throw new BadRequestException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (memberToRemove.role === EstablishmentRole.OWNER) {
      const ownerCount = members.filter((m) => m.role === EstablishmentRole.OWNER).length;
      if (ownerCount <= 1) {
        throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
      }
    }

    const removed = await this.writeRepo.delete(establishmentId, memberId);

    if (!removed) {
      this.#logger.warn(`Member not found or not belonging to establishment`, { establishmentId, memberId });
      throw new BadRequestException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    this.#logger.debug(`Publishing MemberRemovedEvent...`);
    this._eventBus.publish(new MemberRemovedEvent(establishmentId, memberId, asUserId(memberToRemove.userId)));
  }
}

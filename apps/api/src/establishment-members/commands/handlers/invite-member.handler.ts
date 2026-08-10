import { EstablishmentRole, ErrorCodes, Role } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { DbEstablishmentRole } from '@coaster/core/db';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { InviteMemberRequestedEvent } from '../../events';
import { InviteMemberCommand } from '../impl/invite-member.command';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, void> {
  readonly #logger = new Logger(InviteMemberHandler.name);

  constructor(
    private readonly repository: EstablishmentMembersReadRepository,
    private readonly security: SecurityRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand) {
    this.#logger.debug(`Executing inviteMember...`);
    const { establishmentId, email, role, user } = command;

    if (role === EstablishmentRole.OWNER && !(await this.#canGrantOwner(establishmentId, user.id, user.role))) {
      this.#logger.warn(
        `User ${user.id} tried to invite ${email} as OWNER of establishment ${establishmentId} without being one`,
      );
      throw new ForbiddenException(ErrorCodes.CANNOT_GRANT_OWNER_ROLE);
    }

    const existingMember = await this.repository.isMember(establishmentId, email);

    if (existingMember) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
    }

    this.#logger.debug(`Publishing InviteMemberRequestedEvent...`);
    await this.eventBus.publish(new InviteMemberRequestedEvent(establishmentId, email, role, user.language));
  }

  async #canGrantOwner(establishmentId: string, userId: string, platformRole: Role): Promise<boolean> {
    if (platformRole === Role.ADMIN) {
      return true;
    }

    const membership = await this.security.getEstablishmentMemberRole(userId, establishmentId);

    return membership?.active === true && membership.role === DbEstablishmentRole.OWNER;
  }
}

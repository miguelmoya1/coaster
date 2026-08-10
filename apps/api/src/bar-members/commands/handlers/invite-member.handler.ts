import { BarRole, ErrorCodes, Role } from '@coaster/common';
import { SecurityRepository } from '@coaster/core';
import { DbBarRole } from '@coaster/core/db';
import { ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { InviteMemberRequestedEvent } from '../../events';
import { InviteMemberCommand } from '../impl/invite-member.command';

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, void> {
  readonly #logger = new Logger(InviteMemberHandler.name);

  constructor(
    private readonly repository: BarMembersReadRepository,
    private readonly security: SecurityRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand) {
    this.#logger.debug(`Executing inviteMember...`);
    const { barId, email, role, user } = command;

    if (role === BarRole.OWNER && !(await this.#canGrantOwner(barId, user.id, user.role))) {
      this.#logger.warn(`User ${user.id} tried to invite ${email} as OWNER of bar ${barId} without being one`);
      throw new ForbiddenException(ErrorCodes.CANNOT_GRANT_OWNER_ROLE);
    }

    const existingMember = await this.repository.isMember(barId, email);

    if (existingMember) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_MEMBER);
    }

    this.#logger.debug(`Publishing InviteMemberRequestedEvent...`);
    await this.eventBus.publish(new InviteMemberRequestedEvent(barId, email, role, user.language));
  }

  async #canGrantOwner(barId: string, userId: string, platformRole: Role): Promise<boolean> {
    if (platformRole === Role.ADMIN) {
      return true;
    }

    const membership = await this.security.getBarMemberRole(userId, barId);

    return membership?.active === true && membership.role === DbBarRole.OWNER;
  }
}

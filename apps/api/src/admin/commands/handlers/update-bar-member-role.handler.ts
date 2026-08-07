import { AdminAuditAction, AdminAuditTargetType, BarRole, ErrorCodes } from '@coaster/common';
import type { DbBarRole } from '@coaster/core/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { UpdateBarMemberRoleCommand } from '../impl/update-bar-member-role.command';

@CommandHandler(UpdateBarMemberRoleCommand)
export class UpdateBarMemberRoleHandler implements ICommandHandler<UpdateBarMemberRoleCommand, void> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async execute(command: UpdateBarMemberRoleCommand): Promise<void> {
    const { barId, userId, role, actor } = command;
    const bar = await this._readRepo.findBarById(barId);

    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    const membership = await this._readRepo.findMembership(barId, userId);

    if (!membership) {
      throw new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (membership.role === role) {
      return;
    }

    if (membership.role === BarRole.OWNER && (await this._readRepo.countOwners(barId)) <= 1) {
      throw new BadRequestException(ErrorCodes.CANNOT_REMOVE_LAST_OWNER);
    }

    await this._writeRepo.updateBarMemberRole(barId, userId, role as DbBarRole);

    await this._auditRepo.record({
      actorId: actor.id,
      action: AdminAuditAction.BAR_MEMBER_ROLE_CHANGED,
      targetType: AdminAuditTargetType.BAR,
      targetId: barId,
      targetLabel: bar.name,
      metadata: {
        userId,
        userEmail: membership.user.email,
        from: membership.role,
        to: role,
      },
    });
  }
}

import { AdminAuditAction, AdminAuditTargetType, ErrorCodes, Role } from '@coaster/common';
import type { DbRole } from '@coaster/core/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminUserReadRepository } from '../../data-access/admin-user.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { UpdateAdminUserCommand } from '../impl/update-admin-user.command';

@CommandHandler(UpdateAdminUserCommand)
export class UpdateAdminUserHandler implements ICommandHandler<UpdateAdminUserCommand, void> {
  constructor(
    private readonly _readRepo: AdminUserReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async execute(command: UpdateAdminUserCommand): Promise<void> {
    const { userId, dto, actor } = command;

    if (userId === actor.id) {
      throw new BadRequestException(ErrorCodes.CANNOT_EDIT_OWN_ADMIN_ACCOUNT);
    }

    const user = await this._readRepo.findUserById(userId);

    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    const nextRole = dto.role ?? (user.role as Role);
    const nextActive = dto.active ?? user.active;
    const losesAdmin = user.role === Role.ADMIN && (nextRole !== Role.ADMIN || !nextActive);

    if (losesAdmin && (await this._readRepo.countAdmins()) <= 1) {
      throw new BadRequestException(ErrorCodes.CANNOT_DEMOTE_LAST_ADMIN);
    }

    if (nextRole === user.role && nextActive === user.active) {
      return;
    }

    await this._writeRepo.updateUser(userId, {
      role: dto.role ? (dto.role as DbRole) : undefined,
      active: dto.active,
    });

    if (dto.role && dto.role !== user.role) {
      await this._auditRepo.record({
        actorId: actor.id,
        action: AdminAuditAction.USER_ROLE_CHANGED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        targetLabel: user.email,
        metadata: { from: user.role, to: dto.role },
      });
    }

    if (dto.active !== undefined && dto.active !== user.active) {
      await this._auditRepo.record({
        actorId: actor.id,
        action: AdminAuditAction.USER_ACTIVATION_CHANGED,
        targetType: AdminAuditTargetType.USER,
        targetId: userId,
        targetLabel: user.email,
        metadata: { active: dto.active },
      });
    }
  }
}

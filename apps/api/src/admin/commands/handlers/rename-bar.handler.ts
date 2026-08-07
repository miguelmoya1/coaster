import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { RenameBarCommand } from '../impl/rename-bar.command';

@CommandHandler(RenameBarCommand)
export class RenameBarHandler implements ICommandHandler<RenameBarCommand, void> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async execute(command: RenameBarCommand): Promise<void> {
    const { barId, actor } = command;
    const bar = await this._readRepo.findBarById(barId);

    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    const name = command.name.trim();

    if (name === bar.name) {
      return;
    }

    await this._writeRepo.renameBar(barId, name);

    await this._auditRepo.record({
      actorId: actor.id,
      action: AdminAuditAction.BAR_RENAMED,
      targetType: AdminAuditTargetType.BAR,
      targetId: barId,
      targetLabel: name,
      metadata: { from: bar.name, to: name },
    });
  }
}

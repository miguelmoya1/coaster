import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { RenameEstablishmentCommand } from '../impl/rename-establishment.command';

@CommandHandler(RenameEstablishmentCommand)
export class RenameEstablishmentHandler implements ICommandHandler<RenameEstablishmentCommand, void> {
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RenameEstablishmentCommand): Promise<void> {
    const { establishmentId, actor } = command;
    const establishment = await this._readRepo.findEstablishmentById(establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    const name = command.name.trim();

    if (name === establishment.name) {
      return;
    }

    await this._writeRepo.renameEstablishment(establishmentId, name);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.ESTABLISHMENT_RENAMED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: establishmentId,
        targetLabel: name,
        metadata: { from: establishment.name, to: name },
      }),
    );
  }
}

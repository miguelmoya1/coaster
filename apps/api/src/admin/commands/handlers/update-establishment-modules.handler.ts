import type { EstablishmentSettings } from '@coaster/common';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes, resolveModules } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSettingsMapper, EstablishmentSettingsRepository } from '@coaster/establishments';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { UpdateEstablishmentModulesCommand } from '../impl/update-establishment-modules.command';

@CommandHandler(UpdateEstablishmentModulesCommand)
export class UpdateEstablishmentModulesHandler
  implements ICommandHandler<UpdateEstablishmentModulesCommand, EstablishmentSettings>
{
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _settingsRepo: EstablishmentSettingsRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateEstablishmentModulesCommand): Promise<EstablishmentSettings> {
    const { establishmentId, actor } = command;
    const establishment = await this._readRepo.findEstablishmentById(establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    const before = await this._settingsRepo.find(establishmentId);
    const settings = await this._settingsRepo.updateAsAdmin(establishmentId, command.modules);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.ESTABLISHMENT_MODULES_CHANGED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: establishmentId,
        targetLabel: establishment.name,
        metadata: { from: before?.modules ?? null, to: resolveModules(command.modules) },
      }),
    );

    return EstablishmentSettingsMapper.toDto(settings);
  }
}

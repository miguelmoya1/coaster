import type { EstablishmentSettings } from '@coaster/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSettingsRepository } from '../../data-access/establishment-settings.repository';
import { EstablishmentSettingsUpdatedEvent } from '../../events/impl/establishment-settings-updated.event';
import { EstablishmentSettingsMapper } from '../../mappers/establishment-settings.mapper';
import { UpdateEstablishmentSettingsCommand } from '../impl/update-establishment-settings.command';

@CommandHandler(UpdateEstablishmentSettingsCommand)
export class UpdateEstablishmentSettingsHandler implements ICommandHandler<
  UpdateEstablishmentSettingsCommand,
  EstablishmentSettings
> {
  constructor(
    private readonly repository: EstablishmentSettingsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateEstablishmentSettingsCommand): Promise<EstablishmentSettings> {
    const settings = EstablishmentSettingsMapper.toDto(
      await this.repository.update(command.establishmentId, command.modules, command.language, command.markSoldOut),
    );

    this.eventBus.publish(new EstablishmentSettingsUpdatedEvent(command.establishmentId));

    return settings;
  }
}

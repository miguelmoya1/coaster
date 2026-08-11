import type { EstablishmentSettings } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSettingsRepository } from '../../data-access/establishment-settings.repository';
import { EstablishmentSettingsMapper } from '../../mappers/establishment-settings.mapper';
import { UpdateEstablishmentSettingsCommand } from '../impl/update-establishment-settings.command';

@CommandHandler(UpdateEstablishmentSettingsCommand)
export class UpdateEstablishmentSettingsHandler implements ICommandHandler<
  UpdateEstablishmentSettingsCommand,
  EstablishmentSettings
> {
  constructor(private readonly repository: EstablishmentSettingsRepository) {}

  async execute(command: UpdateEstablishmentSettingsCommand): Promise<EstablishmentSettings> {
    return EstablishmentSettingsMapper.toDto(
      await this.repository.update(command.establishmentId, command.modules, command.language),
    );
  }
}

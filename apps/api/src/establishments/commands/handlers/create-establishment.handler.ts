import { DEFAULT_ESTABLISHMENT_MODULES } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentWriteRepository } from '../../data-access/establishment.write.repository';
import { CreateEstablishmentCommand } from '../impl/create-establishment.command';

@CommandHandler(CreateEstablishmentCommand)
export class CreateEstablishmentHandler implements ICommandHandler<CreateEstablishmentCommand, void> {
  constructor(private readonly writeRepo: EstablishmentWriteRepository) {}

  async execute(command: CreateEstablishmentCommand): Promise<void> {
    await this.writeRepo.create(command.user.id, command.dto, DEFAULT_ESTABLISHMENT_MODULES);
  }
}

import { asEstablishmentId, asLanguage, DEFAULT_ESTABLISHMENT_MODULES } from '@coaster/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentWriteRepository } from '../../data-access/establishment.write.repository';
import { EstablishmentCreatedEvent } from '../../events';
import { CreateEstablishmentCommand } from '../impl/create-establishment.command';

@CommandHandler(CreateEstablishmentCommand)
export class CreateEstablishmentHandler implements ICommandHandler<CreateEstablishmentCommand, void> {
  constructor(
    private readonly writeRepo: EstablishmentWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateEstablishmentCommand): Promise<void> {
    const created = await this.writeRepo.create(
      command.user.id,
      command.dto,
      DEFAULT_ESTABLISHMENT_MODULES,
      asLanguage(command.user.language),
    );

    this.eventBus.publish(new EstablishmentCreatedEvent(asEstablishmentId(created.id), command.user.id));
  }
}

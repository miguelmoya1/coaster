import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BarWriteRepository } from '../../data-access/bar.write.repository';
import { CreateBarCommand } from './create-bar.command';

@CommandHandler(CreateBarCommand)
export class CreateBarHandler implements ICommandHandler<CreateBarCommand, void> {
  constructor(private readonly writeRepo: BarWriteRepository) {}

  async execute(command: CreateBarCommand): Promise<void> {
    await this.writeRepo.create(command.user.id, command.dto);
  }
}

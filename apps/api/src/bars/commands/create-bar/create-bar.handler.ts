import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BarRepository } from '../../data-access/bar.repository';
import { CreateBarCommand } from './create-bar.command';

@CommandHandler(CreateBarCommand)
export class CreateBarHandler implements ICommandHandler<CreateBarCommand, void> {
  constructor(private readonly barRepository: BarRepository) {}

  async execute(command: CreateBarCommand): Promise<void> {
    await this.barRepository.create(command.user.id, command.dto);
  }
}

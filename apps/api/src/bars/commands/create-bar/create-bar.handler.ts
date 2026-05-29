import { BarId } from '@coaster/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BarRepository } from '../../data-access/bar.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { CreateBarCommand } from './create-bar.command';

@CommandHandler(CreateBarCommand)
export class CreateBarHandler implements ICommandHandler<CreateBarCommand, { id: BarId }> {
  constructor(private readonly barRepository: BarRepository) {}

  async execute(command: CreateBarCommand): Promise<{ id: BarId }> {
    const bar = await this.barRepository.create(command.user.id, command.dto);
    const domain = BarsMapper.toDomain(bar);
    return { id: domain.id };
  }
}

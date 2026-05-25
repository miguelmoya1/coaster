import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBarCommand } from './create-bar.command';
import { BarRepository } from '../../data-access/bar.repository';
import { BarsMapper } from '../../mappers/bars.mapper';
import { Bar, BarId } from '@coaster/common';

@CommandHandler(CreateBarCommand)
export class CreateBarHandler implements ICommandHandler<CreateBarCommand, { id: BarId }> {
  constructor(private readonly barRepository: BarRepository) {}

  async execute(command: CreateBarCommand): Promise<{ id: BarId }> {
    const bar = await this.barRepository.create(command.user.id, command.dto);
    const domain = BarsMapper.toDomain(bar);
    return { id: domain.id };
  }
}

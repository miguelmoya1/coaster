import { TableId } from '@coaster/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { TablesRepository } from '../../data-access/tables.repository';
import { TableCreatedEvent } from '../../events';
import { TablesMapper } from '../../mappers/tables.mapper';
import { CreateTableCommand } from './create-table.command';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand, { id: TableId }> {
  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateTableCommand): Promise<{ id: TableId }> {
    const table = await this._tablesRepository.create(command.barId, {
      name: command.dto.name,
    });

    const mapped = TablesMapper.toDomain(table);
    this._eventBus.publish(new TableCreatedEvent(command.barId, mapped));
    return { id: mapped.id };
  }
}

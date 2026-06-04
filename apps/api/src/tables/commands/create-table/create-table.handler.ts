import type { TableId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { TablesRepository } from '../../data-access/tables.repository';
import { TableCreatedEvent } from '../../../events';
import { TablesMapper } from '../../mappers/tables.mapper';
import { CreateTableCommand } from './create-table.command';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand, void> {
  readonly #logger = new Logger(CreateTableHandler.name);

  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateTableCommand): Promise<void> {
    this.#logger.debug(`Executing createTable...`);
    const table = await this._tablesRepository.create(command.barId, {
      name: command.dto.name,
    });

    const mapped = TablesMapper.toDomain(table);
    this.#logger.debug(`Publishing TableCreatedEvent...`);
    this._eventBus.publish(new TableCreatedEvent(command.barId, mapped));
    
  }
}

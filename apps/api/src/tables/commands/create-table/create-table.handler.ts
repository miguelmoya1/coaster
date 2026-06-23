import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TablesWriteRepository } from '../../data-access/tables.write.repository';
import { TableCreatedEvent } from '../../events';
import { TablesMapper } from '../../mappers/tables.mapper';
import { CreateTableCommand } from './create-table.command';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand, void> {
  readonly #logger = new Logger(CreateTableHandler.name);

  constructor(
    private readonly writeRepo: TablesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateTableCommand): Promise<void> {
    this.#logger.debug(`Executing createTable...`);
    const table = await this.writeRepo.create(command.barId, {
      name: command.dto.name,
    });

    const mapped = TablesMapper.toDomain(table);
    this.#logger.debug(`Publishing TableCreatedEvent...`);
    this._eventBus.publish(new TableCreatedEvent(command.barId, mapped));
  }
}

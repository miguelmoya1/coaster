import { ErrorCodes } from '../../../core';
import { NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { TablesRepository } from '../../data-access/tables.repository';
import { TableUpdatedEvent } from '../../../events';
import { TablesMapper } from '../../mappers/tables.mapper';
import { UpdateTableCommand } from './update-table.command';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler implements ICommandHandler<UpdateTableCommand, void> {
  readonly #logger = new Logger(UpdateTableHandler.name);

  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateTableCommand): Promise<void> {
    this.#logger.debug(`Executing updateTable...`);
    const existing = await this._tablesRepository.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    const table = await this._tablesRepository.update(command.tableId, command.dto);
    const mapped = TablesMapper.toDomain(table);
    this.#logger.debug(`Publishing TableUpdatedEvent...`);
    this._eventBus.publish(new TableUpdatedEvent(command.barId, mapped));
  }
}

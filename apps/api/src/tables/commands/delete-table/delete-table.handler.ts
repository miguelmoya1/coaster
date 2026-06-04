import { ErrorCodes } from '../../../core';
import { NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { TablesRepository } from '../../data-access/tables.repository';
import { TableDeletedEvent } from '../../../events';
import { DeleteTableCommand } from './delete-table.command';

@CommandHandler(DeleteTableCommand)
export class DeleteTableHandler implements ICommandHandler<DeleteTableCommand, void> {
  readonly #logger = new Logger(DeleteTableHandler.name);

  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteTableCommand): Promise<void> {
    this.#logger.debug(`Executing deleteTable...`);
    const existing = await this._tablesRepository.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    await this._tablesRepository.delete(command.tableId);
    this.#logger.debug(`Publishing TableDeletedEvent...`);
    this._eventBus.publish(new TableDeletedEvent(command.barId, command.tableId));
  }
}

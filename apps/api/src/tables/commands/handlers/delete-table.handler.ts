import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { TablesWriteRepository } from '../../data-access/tables.write.repository';
import { TableDeletedEvent } from '../../events';
import { DeleteTableCommand } from '../impl/delete-table.command';

@CommandHandler(DeleteTableCommand)
export class DeleteTableHandler implements ICommandHandler<DeleteTableCommand, void> {
  readonly #logger = new Logger(DeleteTableHandler.name);

  constructor(
    private readonly readRepo: TablesReadRepository,
    private readonly writeRepo: TablesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: DeleteTableCommand): Promise<void> {
    this.#logger.debug(`Executing deleteTable...`);
    const existing = await this.readRepo.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    await this.writeRepo.delete(command.tableId);
    this.#logger.debug(`Publishing TableDeletedEvent...`);
    this._eventBus.publish(new TableDeletedEvent(command.barId, command.tableId));
  }
}

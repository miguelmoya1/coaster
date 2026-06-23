import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ErrorCodes } from '../../../core';
import { TablesReadRepository } from '../../data-access/tables.read.repository';
import { TablesWriteRepository } from '../../data-access/tables.write.repository';
import { TableUpdatedEvent } from '../../events';
import { TablesMapper } from '../../mappers/tables.mapper';
import { UpdateTableCommand } from './update-table.command';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler implements ICommandHandler<UpdateTableCommand, void> {
  readonly #logger = new Logger(UpdateTableHandler.name);

  constructor(
    private readonly readRepo: TablesReadRepository,
    private readonly writeRepo: TablesWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: UpdateTableCommand): Promise<void> {
    this.#logger.debug(`Executing updateTable...`);
    const existing = await this.readRepo.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    const table = await this.writeRepo.update(command.tableId, command.dto);
    const mapped = TablesMapper.toDomain(table);
    this.#logger.debug(`Publishing TableUpdatedEvent...`);
    this._eventBus.publish(new TableUpdatedEvent(command.barId, mapped));
  }
}

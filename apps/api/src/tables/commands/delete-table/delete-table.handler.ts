import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTableCommand } from './delete-table.command';
import { TablesRepository } from '../../data-access/tables.repository';
import { BarGateway } from '../../../core';
import { ErrorCodes, SocketEvents } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(DeleteTableCommand)
export class DeleteTableHandler implements ICommandHandler<DeleteTableCommand, void> {
  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: DeleteTableCommand): Promise<void> {
    const existing = await this._tablesRepository.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    await this._tablesRepository.delete(command.tableId);
    this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_DELETED, { id: command.tableId });
  }
}

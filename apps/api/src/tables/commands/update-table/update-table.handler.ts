import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTableCommand } from './update-table.command';
import { TablesRepository } from '../../data-access/tables.repository';
import { TablesMapper } from '../../mappers/tables.mapper';
import { BarGateway } from '../../../core';
import { ErrorCodes, SocketEvents } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(UpdateTableCommand)
export class UpdateTableHandler implements ICommandHandler<UpdateTableCommand, void> {
  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: UpdateTableCommand): Promise<void> {
    const existing = await this._tablesRepository.findById(command.tableId);
    if (!existing || existing.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    const table = await this._tablesRepository.update(command.tableId, command.dto);
    const mapped = TablesMapper.toDomain(table);
    this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_UPDATED, mapped);
  }
}

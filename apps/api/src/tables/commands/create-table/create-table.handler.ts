import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTableCommand } from './create-table.command';
import { TablesRepository } from '../../data-access/tables.repository';
import { TablesMapper } from '../../mappers/tables.mapper';
import { BarGateway } from '../../../core';
import { SocketEvents, TableId } from '@coaster/common';

@CommandHandler(CreateTableCommand)
export class CreateTableHandler implements ICommandHandler<CreateTableCommand, { id: TableId }> {
  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async execute(command: CreateTableCommand): Promise<{ id: TableId }> {
    const table = await this._tablesRepository.create(command.barId, {
      name: command.dto.name,
    });

    const mapped = TablesMapper.toDomain(table);
    this._barGateway.server.to(command.barId).emit(SocketEvents.TABLE_CREATED, mapped);
    return { id: mapped.id };
  }
}

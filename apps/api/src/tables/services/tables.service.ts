import { BarId, CreateTableDto, ErrorCodes, SocketEvents, TableId, UpdateTableDto } from '@coaster/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BarGateway } from '../../core';
import { TablesRepository } from '../data-access/tables.repository';
import { TablesMapper } from '../mappers/tables.mapper';

@Injectable()
export class TablesService {
  constructor(
    private readonly _tablesRepository: TablesRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async getTablesByBarId(barId: BarId) {
    const tables = await this._tablesRepository.findByBarId(barId);
    return tables.map((t) => TablesMapper.toDomain(t));
  }

  async createTable(barId: BarId, dto: CreateTableDto) {
    const table = await this._tablesRepository.create(barId, {
      name: dto.name,
    });

    const mapped = TablesMapper.toDomain(table);
    this._barGateway.server.to(barId).emit(SocketEvents.TABLE_CREATED, mapped);
    return mapped;
  }

  async updateTable(barId: BarId, tableId: TableId, dto: UpdateTableDto) {
    const existing = await this._tablesRepository.findById(tableId);
    if (!existing || existing.barId !== barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    const table = await this._tablesRepository.update(tableId, dto);
    const mapped = TablesMapper.toDomain(table);
    this._barGateway.server.to(barId).emit(SocketEvents.TABLE_UPDATED, mapped);
    return mapped;
  }

  async deleteTable(barId: BarId, tableId: TableId) {
    const existing = await this._tablesRepository.findById(tableId);
    if (!existing || existing.barId !== barId) {
      throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
    }

    await this._tablesRepository.delete(tableId);
    this._barGateway.server.to(barId).emit(SocketEvents.TABLE_DELETED, { id: tableId });
  }
}

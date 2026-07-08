import type { BarId, Table, TableId } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard, commonMapper } from '../../core';
import { CreateTableCommand, DeleteTableCommand, UpdateTableCommand } from '../commands';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TablesMapper } from '../mappers/tables.mapper';
import { GetTablesByBarIdQuery } from '../queries';

@Controller('bars/:barId/tables')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class TablesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_TABLES)
  async getTables(@Param('barId') barId: BarId) {
    const tables = await this._queryBus.execute<GetTablesByBarIdQuery, Table[]>(new GetTablesByBarIdQuery(barId));
    return tables.map((t) => TablesMapper.toDto(t));
  }

  @Post()
  @BarPermissions(BarPermission.BAR_CREATE_TABLE)
  async createTable(@Param('barId') barId: BarId, @Body() dto: CreateTableDto): Promise<void> {
    await this._commandBus.execute<CreateTableCommand, void>(new CreateTableCommand(barId, dto));
  }

  @Patch(':tableId')
  @BarPermissions(BarPermission.BAR_UPDATE_TABLE)
  async updateTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId, @Body() dto: UpdateTableDto) {
    await this._commandBus.execute<UpdateTableCommand, void>(new UpdateTableCommand(barId, tableId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':tableId')
  @BarPermissions(BarPermission.BAR_DELETE_TABLE)
  async deleteTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId) {
    await this._commandBus.execute<DeleteTableCommand, void>(new DeleteTableCommand(barId, tableId));
    return commonMapper.getSuccessResponse();
  }
}

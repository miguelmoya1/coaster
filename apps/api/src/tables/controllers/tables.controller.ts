import type { BarId, Table, TableId } from '@coaster/common';
import { BarPermission } from '../../core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, FirebaseAuthGuard, Permissions, PermissionsGuard } from '../../core';
import { CreateTableCommand, UpdateTableCommand, DeleteTableCommand } from '../commands';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TablesMapper } from '../mappers/tables.mapper';
import { GetTablesByBarIdQuery } from '../queries';

@Controller('bars/:barId/tables')
@UseGuards(FirebaseAuthGuard, PermissionsGuard)
export class TablesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Permissions(BarPermission.VIEW_TABLES)
  async getTables(@Param('barId') barId: BarId) {
    const tables = await this._queryBus.execute<GetTablesByBarIdQuery, Table[]>(new GetTablesByBarIdQuery(barId));
    return tables.map((t) => TablesMapper.toDto(t));
  }

  @Post()
  @Permissions(BarPermission.CREATE_TABLE)
  async createTable(@Param('barId') barId: BarId, @Body() dto: CreateTableDto) {
    const result = await this._commandBus.execute<CreateTableCommand, { id: TableId }>(
      new CreateTableCommand(barId, dto),
    );
    return { id: result.id };
  }

  @Patch(':tableId')
  @Permissions(BarPermission.UPDATE_TABLE)
  async updateTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId, @Body() dto: UpdateTableDto) {
    await this._commandBus.execute<UpdateTableCommand, void>(new UpdateTableCommand(barId, tableId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':tableId')
  @Permissions(BarPermission.DELETE_TABLE)
  async deleteTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId) {
    await this._commandBus.execute<DeleteTableCommand, void>(new DeleteTableCommand(barId, tableId));
    return commonMapper.getSuccessResponse();
  }
}

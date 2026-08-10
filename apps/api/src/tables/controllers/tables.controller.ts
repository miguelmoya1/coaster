import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, Table, TableId } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, commonMapper } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTableCommand, DeleteTableCommand, UpdateTableCommand } from '../commands';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TablesMapper } from '../mappers/tables.mapper';
import { GetTablesByEstablishmentIdQuery } from '../queries';

@Controller('establishments/:establishmentId/tables')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class TablesController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_TABLES)
  async getTables(@Param('establishmentId') establishmentId: EstablishmentId) {
    const tables = await this._queryBus.execute<GetTablesByEstablishmentIdQuery, Table[]>(
      new GetTablesByEstablishmentIdQuery(establishmentId),
    );
    return tables.map((t) => TablesMapper.toDto(t));
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_TABLE)
  async createTable(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateTableDto,
  ): Promise<void> {
    await this._commandBus.execute<CreateTableCommand, void>(new CreateTableCommand(establishmentId, dto));
  }

  @Patch(':tableId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_TABLE)
  async updateTable(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('tableId') tableId: TableId,
    @Body() dto: UpdateTableDto,
  ) {
    await this._commandBus.execute<UpdateTableCommand, void>(new UpdateTableCommand(establishmentId, tableId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':tableId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_TABLE)
  async deleteTable(@Param('establishmentId') establishmentId: EstablishmentId, @Param('tableId') tableId: TableId) {
    await this._commandBus.execute<DeleteTableCommand, void>(new DeleteTableCommand(establishmentId, tableId));
    return commonMapper.getSuccessResponse();
  }
}

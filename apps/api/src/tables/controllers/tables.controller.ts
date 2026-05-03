import { type BarId, BarRole, type TableId } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { commonMapper, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
import { TablesMapper } from '../mappers/tables.mapper';
import { TablesService } from '../services/tables.service';

@Controller('bars/:barId/tables')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly _tablesService: TablesService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getTables(@Param('barId') barId: BarId) {
    const tables = await this._tablesService.getTablesByBarId(barId);
    return tables.map((t) => TablesMapper.toDto(t));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createTable(@Param('barId') barId: BarId, @Body() dto: CreateTableDto) {
    const table = await this._tablesService.createTable(barId, dto);
    return TablesMapper.toDto(table);
  }

  @Patch(':tableId')
  @Roles(BarRole.OWNER)
  async updateTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId, @Body() dto: UpdateTableDto) {
    const table = await this._tablesService.updateTable(barId, tableId, dto);
    return TablesMapper.toDto(table);
  }

  @Delete(':tableId')
  @Roles(BarRole.OWNER)
  async deleteTable(@Param('barId') barId: BarId, @Param('tableId') tableId: TableId) {
    await this._tablesService.deleteTable(barId, tableId);
    return commonMapper.getSuccessResponse();
  }
}

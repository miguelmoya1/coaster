import type {
  BarId,
  GenerateDeviceKeyResponseDto,
  PrinterConnectionDetailsDto,
  PrinterStatusDto,
} from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth';
import { BarPermissions, BarPermissionsGuard } from '../core';
import { GenerateDeviceKeyCommand } from './commands';
import { GetPrinterConnectionQuery, GetPrinterStatusQuery } from './queries';

@ApiTags('printer')
@Controller('bars/:barId/printer')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class PrinterConnectionController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get('connection')
  @BarPermissions(BarPermission.BAR_VIEW_PRINTER)
  @ApiOperation({ summary: 'Get printer connection details (IP address, port, and JWT token)' })
  async getConnection(@Param('barId') barId: BarId): Promise<PrinterConnectionDetailsDto> {
    return this._queryBus.execute(new GetPrinterConnectionQuery(barId));
  }

  @Get('status')
  @BarPermissions(BarPermission.BAR_VIEW_PRINTER)
  @ApiOperation({ summary: 'Get printer status (online/offline, last seen)' })
  async getStatus(@Param('barId') barId: BarId): Promise<PrinterStatusDto> {
    return this._queryBus.execute(new GetPrinterStatusQuery(barId));
  }

  @Post('device-key')
  @BarPermissions(BarPermission.BAR_MANAGE_PRINTER)
  @ApiOperation({
    summary: 'Generate a new device key for the printer bridge. The key is shown only once.',
  })
  async generateDeviceKey(@Param('barId') barId: BarId): Promise<GenerateDeviceKeyResponseDto> {
    return this._commandBus.execute(new GenerateDeviceKeyCommand(barId));
  }
}

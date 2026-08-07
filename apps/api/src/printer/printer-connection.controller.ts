import { FirebaseAuthGuard } from '@coaster/auth';
import type {
  BarId,
  EnqueuePrintJobResponseDto,
  GenerateDeviceKeyResponseDto,
  PrinterConnectionDetailsDto,
  PrinterStatusDto,
  PrintJobDto,
} from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { BarPermissions, BarPermissionsGuard } from '@coaster/core';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnqueuePrintJobCommand, GenerateDeviceKeyCommand } from './commands';
import { PrintTicketDto } from './dto/print-ticket.dto';
import { GetPrinterConnectionQuery, GetPrinterStatusQuery, GetPrintJobQuery } from './queries';

@ApiTags('printer')
@Controller('bars/:barId/printer')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class PrinterConnectionController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post('jobs')
  @BarPermissions(BarPermission.BAR_VIEW_PRINTER)
  @ApiOperation({ summary: 'Queue a ticket for the bar printer' })
  async print(@Param('barId') barId: BarId, @Body() payload: PrintTicketDto): Promise<EnqueuePrintJobResponseDto> {
    return this._commandBus.execute(new EnqueuePrintJobCommand(barId, payload));
  }

  @Get('jobs/:jobId')
  @BarPermissions(BarPermission.BAR_VIEW_PRINTER)
  @ApiOperation({ summary: 'Check whether a queued ticket has printed' })
  async jobStatus(@Param('barId') barId: BarId, @Param('jobId') jobId: string): Promise<PrintJobDto> {
    return this._queryBus.execute(new GetPrintJobQuery(barId, jobId));
  }

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
    summary: 'Issue or rotate the bridge device key. The key is shown only once.',
  })
  async generateDeviceKey(@Param('barId') barId: BarId): Promise<GenerateDeviceKeyResponseDto> {
    return this._commandBus.execute(new GenerateDeviceKeyCommand(barId));
  }
}

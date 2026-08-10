import { FirebaseAuthGuard } from '@coaster/auth';
import type {
  EstablishmentId,
  EnqueuePrintJobResponseDto,
  GenerateDeviceKeyResponseDto,
  PrinterConnectionDetailsDto,
  PrinterStatusDto,
  PrintJobDto,
} from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard } from '@coaster/core';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EnqueuePrintJobCommand, GenerateDeviceKeyCommand } from './commands';
import { PrintTicketDto } from './dto/print-ticket.dto';
import { GetPrinterConnectionQuery, GetPrinterStatusQuery, GetPrintJobQuery } from './queries';

@ApiTags('printer')
@Controller('establishments/:establishmentId/printer')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class PrinterConnectionController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Post('jobs')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRINTER)
  @ApiOperation({ summary: 'Queue a ticket for the establishment printer' })
  async print(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() payload: PrintTicketDto,
  ): Promise<EnqueuePrintJobResponseDto> {
    return this._commandBus.execute(new EnqueuePrintJobCommand(establishmentId, payload));
  }

  @Get('jobs/:jobId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRINTER)
  @ApiOperation({ summary: 'Check whether a queued ticket has printed' })
  async jobStatus(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('jobId') jobId: string,
  ): Promise<PrintJobDto> {
    return this._queryBus.execute(new GetPrintJobQuery(establishmentId, jobId));
  }

  @Get('connection')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRINTER)
  @ApiOperation({ summary: 'Get printer connection details (IP address, port, and JWT token)' })
  async getConnection(
    @Param('establishmentId') establishmentId: EstablishmentId,
  ): Promise<PrinterConnectionDetailsDto> {
    return this._queryBus.execute(new GetPrinterConnectionQuery(establishmentId));
  }

  @Get('status')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRINTER)
  @ApiOperation({ summary: 'Get printer status (online/offline, last seen)' })
  async getStatus(@Param('establishmentId') establishmentId: EstablishmentId): Promise<PrinterStatusDto> {
    return this._queryBus.execute(new GetPrinterStatusQuery(establishmentId));
  }

  @Post('device-key')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_MANAGE_PRINTER)
  @ApiOperation({
    summary: 'Issue or rotate the bridge device key. The key is shown only once.',
  })
  async generateDeviceKey(
    @Param('establishmentId') establishmentId: EstablishmentId,
  ): Promise<GenerateDeviceKeyResponseDto> {
    return this._commandBus.execute(new GenerateDeviceKeyCommand(establishmentId));
  }
}

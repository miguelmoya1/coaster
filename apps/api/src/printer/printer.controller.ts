import type { EstablishmentId, ClaimedPrintJobDto } from '@coaster/common';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { RegisterPrinterIpCommand, ReportPrintJobResultCommand } from './commands';
import { PrintJobResultDto } from './dto/print-job-result.dto';
import { RegisterPrinterIpDto } from './dto/register-printer-ip.dto';
import { ClaimNextPrintJobQuery } from './queries';
import { PrinterReleaseService } from './services/printer-release.service';

@ApiTags('printer')
@Controller('printer')
export class PrinterController {
  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly _releases: PrinterReleaseService,
  ) {}

  @Get('check-version')
  @ApiOperation({ summary: 'Latest published bridge version, with the checksum of its binary' })
  @ApiQuery({ name: 'os', required: true, example: 'windows', enum: ['windows', 'linux'] })
  async checkVersion(@Query('os') os: string) {
    const release = await this._releases.find(os);
    if (!release) {
      throw new BadRequestException('Unsupported OS. Use "windows" or "linux".');
    }
    return release;
  }

  @Post('register-ip')
  @ApiOperation({ summary: 'Heartbeat from the bridge, carrying its address on the local network' })
  async registerIp(@Headers('x-device-key') deviceKey: string | undefined, @Body() body: RegisterPrinterIpDto) {
    if (!deviceKey) {
      throw new UnauthorizedException('X-Device-Key header is required');
    }

    await this._commandBus.execute(
      new RegisterPrinterIpCommand(body.establishmentId, body.ipAddress, deviceKey, body.port),
    );

    return { success: true };
  }

  @Get('jobs/next')
  @SkipThrottle()
  @ApiOperation({ summary: 'Claim the next queued print job (called by the bridge)' })
  @ApiQuery({ name: 'establishmentId', required: true })
  async nextJob(
    @Headers('x-device-key') deviceKey: string | undefined,
    @Query('establishmentId') establishmentId: EstablishmentId,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ClaimedPrintJobDto | undefined> {
    if (!establishmentId) {
      throw new BadRequestException('establishmentId is required');
    }

    const job = await this._queryBus.execute<ClaimNextPrintJobQuery, ClaimedPrintJobDto | null>(
      new ClaimNextPrintJobQuery(establishmentId, deviceKey),
    );

    if (!job) {
      reply.status(HttpStatus.NO_CONTENT);
      return undefined;
    }

    return job;
  }

  @Post('jobs/:jobId/result')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Report whether a print job made it onto paper (called by the bridge)' })
  @ApiQuery({ name: 'establishmentId', required: true })
  async reportResult(
    @Headers('x-device-key') deviceKey: string | undefined,
    @Query('establishmentId') establishmentId: EstablishmentId,
    @Param('jobId') jobId: string,
    @Body() body: PrintJobResultDto,
  ): Promise<void> {
    if (!establishmentId) {
      throw new BadRequestException('establishmentId is required');
    }

    await this._commandBus.execute(new ReportPrintJobResultCommand(establishmentId, jobId, deviceKey, body));
  }
}

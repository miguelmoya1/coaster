import type { EstablishmentId, ClaimedPrintJobDto, PrinterPairingResult } from '@coaster/common';
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
import { SkipSubscriptionCheck } from '@coaster/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle, seconds } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import { RedeemPairingCommand, RegisterPrinterIpCommand, ReportPrintJobResultCommand } from './commands';
import { PrintJobResultDto } from './dto/print-job-result.dto';
import { RedeemPairingDto } from './dto/redeem-pairing.dto';
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

  /**
   * Called by a bridge that has just been double-clicked and knows nothing yet, so it cannot carry
   * a token. The code is the credential: one use, an hour to live, and worthless afterwards.
   */
  @Post('pair')
  @SkipSubscriptionCheck()
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  async pair(@Body() dto: RedeemPairingDto): Promise<PrinterPairingResult> {
    return this._commandBus.execute<RedeemPairingCommand, PrinterPairingResult>(new RedeemPairingCommand(dto.code));
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

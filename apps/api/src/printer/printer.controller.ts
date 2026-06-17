import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrinterService } from './printer.service';

@ApiTags('printer')
@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Get('check-version')
  @ApiOperation({ summary: 'Check for the latest printer executable version' })
  @ApiQuery({ name: 'os', required: true, example: 'windows', enum: ['windows', 'linux'] })
  checkVersion(@Query('os') os: string) {
    return this.printerService.getLatestVersion(os);
  }
}

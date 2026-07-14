import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RegisterPrinterIpCommand } from './commands';
import { RegisterPrinterIpDto } from './dto/register-printer-ip.dto';

@ApiTags('printer')
@Controller('printer')
export class PrinterController {
  constructor(private readonly _commandBus: CommandBus) {}

  @Get('check-version')
  @ApiOperation({ summary: 'Check for the latest printer executable version' })
  @ApiQuery({ name: 'os', required: true, example: 'windows', enum: ['windows', 'linux'] })
  checkVersion(@Query('os') os: string) {
    const version = '1.0.3';
    const baseUrl = process.env['PUBLIC_URL'] || 'http://localhost:3000';

    if (os === 'windows') {
      return {
        version,
        url: `${baseUrl}/public/downloads/printer-service-windows.exe`,
      };
    } else if (os === 'linux') {
      return {
        version,
        url: `${baseUrl}/public/downloads/printer-service-linux`,
      };
    }

    throw new BadRequestException('Unsupported OS. Use "windows" or "linux".');
  }

  @Post('register-ip')
  @ApiOperation({ summary: 'Register printer IP address (called by Go printer-service)' })
  async registerIp(@Headers('x-device-key') deviceKey: string | undefined, @Body() body: RegisterPrinterIpDto) {
    if (!deviceKey) {
      throw new UnauthorizedException('X-Device-Key header is required');
    }

    await this._commandBus.execute(new RegisterPrinterIpCommand(body.barId, body.ipAddress, deviceKey));

    return { success: true };
  }
}

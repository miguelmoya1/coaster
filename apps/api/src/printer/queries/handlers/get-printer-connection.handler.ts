import type { PrinterConnectionDetailsDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterTokenService } from '../../services/printer-token.service';
import { GetPrinterConnectionQuery } from '../impl/get-printer-connection.query';

@QueryHandler(GetPrinterConnectionQuery)
export class GetPrinterConnectionHandler implements IQueryHandler<
  GetPrinterConnectionQuery,
  PrinterConnectionDetailsDto
> {
  constructor(
    private readonly readRepo: PrinterReadRepository,
    private readonly tokenService: PrinterTokenService,
  ) {}

  async execute(query: GetPrinterConnectionQuery): Promise<PrinterConnectionDetailsDto> {
    const config = await this.readRepo.findByBarId(query.barId);

    if (!config?.ipAddress) {
      throw new NotFoundException(ErrorCodes.PRINTER_NOT_CONNECTED);
    }

    const token = this.tokenService.generateToken(query.barId);

    return {
      ipAddress: config.ipAddress,
      port: config.port,
      token,
    };
  }
}

import type { PrinterStatusDto } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { GetPrinterStatusQuery } from '../impl/get-printer-status.query';

/** Consider a printer "online" if it was seen in the last 2 minutes. */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

@QueryHandler(GetPrinterStatusQuery)
export class GetPrinterStatusHandler implements IQueryHandler<GetPrinterStatusQuery, PrinterStatusDto> {
  constructor(private readonly readRepo: PrinterReadRepository) {}

  async execute(query: GetPrinterStatusQuery): Promise<PrinterStatusDto> {
    const config = await this.readRepo.findByBarId(query.barId);

    if (!config) {
      return {
        barId: query.barId,
        isOnline: false,
        ipAddress: null,
        port: 8080,
        lastSeenAt: null,
      };
    }

    const isOnline = !!config.lastSeenAt && Date.now() - config.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;

    return {
      barId: query.barId,
      isOnline,
      ipAddress: config.ipAddress,
      port: config.port,
      lastSeenAt: config.lastSeenAt?.toISOString() ?? null,
    };
  }
}

import type { ClaimedPrintJobDto, PrintTicketPayloadDto } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { ClaimNextPrintJobQuery } from '../impl/claim-next-print-job.query';

const HOLD_REQUEST_OPEN_FOR_MS = 25_000;
const CHECK_QUEUE_EVERY_MS = 1_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@QueryHandler(ClaimNextPrintJobQuery)
export class ClaimNextPrintJobHandler implements IQueryHandler<ClaimNextPrintJobQuery, ClaimedPrintJobDto | null> {
  readonly #logger = new Logger(ClaimNextPrintJobHandler.name);

  constructor(
    private readonly jobRepo: PrintJobRepository,
    private readonly writeRepo: PrinterWriteRepository,
    private readonly deviceKey: DeviceKeyService,
  ) {}

  async execute(query: ClaimNextPrintJobQuery): Promise<ClaimedPrintJobDto | null> {
    await this.deviceKey.authenticate(query.barId, query.deviceKey);

    await this.writeRepo.updateLastSeen(query.barId);
    await this.jobRepo.requeueStaleClaims(query.barId);

    const stopWaitingAt = Date.now() + HOLD_REQUEST_OPEN_FOR_MS;

    do {
      const job = await this.claimNext(query.barId);

      if (job) {
        this.#logger.debug(`Handed print job ${job.id} to the bridge for bar ${query.barId}`);
        return job;
      }

      await delay(CHECK_QUEUE_EVERY_MS);
    } while (Date.now() < stopWaitingAt);

    return null;
  }

  private async claimNext(barId: ClaimNextPrintJobQuery['barId']): Promise<ClaimedPrintJobDto | null> {
    const job = await this.jobRepo.claimNext(barId);

    if (!job) {
      return null;
    }

    return { id: job.id, payload: job.payload as unknown as PrintTicketPayloadDto };
  }
}

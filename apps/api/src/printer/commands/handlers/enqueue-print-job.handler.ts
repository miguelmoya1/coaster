import type { EnqueuePrintJobResponseDto } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { EnqueuePrintJobCommand } from '../impl/enqueue-print-job.command';

@CommandHandler(EnqueuePrintJobCommand)
export class EnqueuePrintJobHandler implements ICommandHandler<EnqueuePrintJobCommand, EnqueuePrintJobResponseDto> {
  readonly #logger = new Logger(EnqueuePrintJobHandler.name);

  constructor(
    private readonly readRepo: PrinterReadRepository,
    private readonly jobRepo: PrintJobRepository,
  ) {}

  async execute(command: EnqueuePrintJobCommand): Promise<EnqueuePrintJobResponseDto> {
    const config = await this.readRepo.findByBarId(command.barId);
    if (!config) {
      throw new NotFoundException(ErrorCodes.PRINTER_NOT_CONFIGURED);
    }

    const job = await this.jobRepo.enqueue(command.barId, command.payload);
    this.#logger.log(`Queued print job ${job.id} for bar ${command.barId}`);

    return { jobId: job.id };
  }
}

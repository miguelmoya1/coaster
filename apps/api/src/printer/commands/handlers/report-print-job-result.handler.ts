import { ErrorCodes } from '@coaster/common';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { ReportPrintJobResultCommand } from '../impl/report-print-job-result.command';

@CommandHandler(ReportPrintJobResultCommand)
export class ReportPrintJobResultHandler implements ICommandHandler<ReportPrintJobResultCommand, void> {
  readonly #logger = new Logger(ReportPrintJobResultHandler.name);

  constructor(
    private readonly jobRepo: PrintJobRepository,
    private readonly writeRepo: PrinterWriteRepository,
    private readonly deviceKey: DeviceKeyService,
  ) {}

  async execute(command: ReportPrintJobResultCommand): Promise<void> {
    await this.deviceKey.authenticate(command.establishmentId, command.deviceKey);

    const job = await this.jobRepo.findById(command.jobId);
    if (!job || job.establishmentId !== command.establishmentId) {
      throw new NotFoundException(ErrorCodes.PRINT_JOB_NOT_FOUND);
    }

    if (command.result.status === 'printed') {
      await this.jobRepo.complete(job.id);
      this.#logger.log(`Print job ${job.id} printed`);
    } else {
      const error = command.result.error ?? 'The bridge did not say why';
      await this.jobRepo.fail(job.id, error);
      this.#logger.warn(`Print job ${job.id} failed: ${error}`);
    }

    await this.writeRepo.updateLastSeen(command.establishmentId);
  }
}

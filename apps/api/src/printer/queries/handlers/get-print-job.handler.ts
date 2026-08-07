import type { PrintJobDto, PrintJobStatus } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { GetPrintJobQuery } from '../impl/get-print-job.query';

@QueryHandler(GetPrintJobQuery)
export class GetPrintJobHandler implements IQueryHandler<GetPrintJobQuery, PrintJobDto> {
  constructor(private readonly jobRepo: PrintJobRepository) {}

  async execute(query: GetPrintJobQuery): Promise<PrintJobDto> {
    const job = await this.jobRepo.findById(query.jobId);

    if (!job || job.barId !== query.barId) {
      throw new NotFoundException(ErrorCodes.PRINT_JOB_NOT_FOUND);
    }

    return {
      id: job.id,
      status: job.status as PrintJobStatus,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }
}

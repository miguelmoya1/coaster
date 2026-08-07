import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { ReportPrintJobResultCommand } from '../impl/report-print-job-result.command';
import { ReportPrintJobResultHandler } from './report-print-job-result.handler';

describe('ReportPrintJobResultHandler', () => {
  let handler: ReportPrintJobResultHandler;
  let jobRepo: {
    findById: ReturnType<typeof vi.fn>;
    complete: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
  };
  let readRepo: { findByBarId: ReturnType<typeof vi.fn> };
  let writeRepo: { updateLastSeen: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    jobRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'job-1', barId: 'bar-1' }),
      complete: vi.fn().mockResolvedValue({ count: 1 }),
      fail: vi.fn().mockResolvedValue({ count: 1 }),
    };
    readRepo = { findByBarId: vi.fn().mockResolvedValue({ barId: 'bar-1', deviceKey: 'key-xyz' }) };
    writeRepo = { updateLastSeen: vi.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportPrintJobResultHandler,
        DeviceKeyService,
        { provide: PrintJobRepository, useValue: jobRepo },
        { provide: PrinterReadRepository, useValue: readRepo },
        { provide: PrinterWriteRepository, useValue: writeRepo },
      ],
    }).compile();

    handler = module.get(ReportPrintJobResultHandler);
  });

  const command = (result: { status: 'printed' | 'failed'; error?: string }, deviceKey = 'key-xyz') =>
    new ReportPrintJobResultCommand('bar-1' as any, 'job-1', deviceKey, result);

  it('should mark a printed job complete', async () => {
    await handler.execute(command({ status: 'printed' }));

    expect(jobRepo.complete).toHaveBeenCalledWith('job-1');
    expect(jobRepo.fail).not.toHaveBeenCalled();
  });

  it('should record the reason a job failed', async () => {
    await handler.execute(command({ status: 'failed', error: 'out of paper' }));

    expect(jobRepo.fail).toHaveBeenCalledWith('job-1', 'out of paper');
  });

  it('should reject a wrong device key', async () => {
    await expect(handler.execute(command({ status: 'printed' }, 'wrong'))).rejects.toThrow(ForbiddenException);
    expect(jobRepo.complete).not.toHaveBeenCalled();
  });

  it('should refuse a job belonging to another bar', async () => {
    jobRepo.findById.mockResolvedValue({ id: 'job-1', barId: 'another-bar' });

    await expect(handler.execute(command({ status: 'printed' }))).rejects.toThrow(NotFoundException);
    expect(jobRepo.complete).not.toHaveBeenCalled();
  });

  it('should report an unknown job as not found', async () => {
    jobRepo.findById.mockResolvedValue(null);

    await expect(handler.execute(command({ status: 'printed' }))).rejects.toThrow(ErrorCodes.PRINT_JOB_NOT_FOUND);
  });
});

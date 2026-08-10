import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintJobRepository } from '../../data-access/print-job.repository';
import { PrinterReadRepository } from '../../data-access/printer.read.repository';
import { PrinterWriteRepository } from '../../data-access/printer.write.repository';
import { DeviceKeyService } from '../../services/device-key.service';
import { ClaimNextPrintJobQuery } from '../impl/claim-next-print-job.query';
import { ClaimNextPrintJobHandler } from './claim-next-print-job.handler';

describe('ClaimNextPrintJobHandler', () => {
  let handler: ClaimNextPrintJobHandler;
  let jobRepo: {
    claimNext: ReturnType<typeof vi.fn>;
    requeueStaleClaims: ReturnType<typeof vi.fn>;
  };
  let readRepo: { findByEstablishmentId: ReturnType<typeof vi.fn> };
  let writeRepo: { updateLastSeen: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();

    jobRepo = {
      claimNext: vi.fn().mockResolvedValue(null),
      requeueStaleClaims: vi.fn().mockResolvedValue(undefined),
    };
    readRepo = {
      findByEstablishmentId: vi.fn().mockResolvedValue({ establishmentId: 'establishment-1', deviceKey: 'key-xyz' }),
    };
    writeRepo = { updateLastSeen: vi.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimNextPrintJobHandler,
        DeviceKeyService,
        { provide: PrintJobRepository, useValue: jobRepo },
        { provide: PrinterReadRepository, useValue: readRepo },
        { provide: PrinterWriteRepository, useValue: writeRepo },
      ],
    }).compile();

    handler = module.get(ClaimNextPrintJobHandler);
  });

  afterEach(() => vi.useRealTimers());

  const query = (deviceKey?: string) => new ClaimNextPrintJobQuery('establishment-1' as any, deviceKey ?? 'key-xyz');

  it('should return a waiting job straight away', async () => {
    jobRepo.claimNext.mockResolvedValue({
      id: 'job-1',
      payload: { type: 'order', total: '9.00' },
    });

    const result = await handler.execute(query());

    expect(result).toEqual({ id: 'job-1', payload: { type: 'order', total: '9.00' } });
  });

  it('should reject a request with no device key', async () => {
    await expect(handler.execute(query(''))).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a wrong device key', async () => {
    await expect(handler.execute(query('not-the-key'))).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query('not-the-key'))).rejects.toThrow(ErrorCodes.PRINTER_INVALID_DEVICE_KEY);
  });

  it('should record that the bridge is alive', async () => {
    jobRepo.claimNext.mockResolvedValue({ id: 'job-1', payload: {} });

    await handler.execute(query());

    expect(writeRepo.updateLastSeen).toHaveBeenCalledWith('establishment-1');
  });

  it('should recover jobs abandoned by a previous bridge', async () => {
    jobRepo.claimNext.mockResolvedValue({ id: 'job-1', payload: {} });

    await handler.execute(query());

    expect(jobRepo.requeueStaleClaims).toHaveBeenCalledWith('establishment-1');
  });

  it('should hold the request open and return null when nothing is queued', async () => {
    const promise = handler.execute(query());

    const settled = promise.catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(await settled).toBeNull();
    expect(jobRepo.claimNext.mock.calls.length).toBeGreaterThan(1);
  });

  it('should return a job that arrives while the request is open', async () => {
    const promise = handler.execute(query());
    const settled = promise.catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(3_000);
    jobRepo.claimNext.mockResolvedValue({ id: 'late-job', payload: { type: 'order' } });
    await vi.advanceTimersByTimeAsync(3_000);

    expect(await settled).toMatchObject({ id: 'late-job' });
  });
});

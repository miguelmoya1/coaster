import { ErrorCodes } from '@coaster/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FichitSync } from '../services/fichit-sync.service';
import { ClockingMovedGuard } from './clocking-moved.guard';

const context = (establishmentId: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ params: { establishmentId } }) }),
  }) as unknown as ExecutionContext;

describe('ClockingMovedGuard', () => {
  it('lets the write through while the establishment still clocks here', async () => {
    const sync = { clocksInFichit: vi.fn().mockResolvedValue(false) };

    await expect(
      new ClockingMovedGuard(sync as unknown as FichitSync).canActivate(context('est_1')),
    ).resolves.toBe(true);
  });

  it('closes the write path once the establishment has moved', async () => {
    const sync = { clocksInFichit: vi.fn().mockResolvedValue(true) };

    await expect(
      new ClockingMovedGuard(sync as unknown as FichitSync).canActivate(context('est_1')),
    ).rejects.toThrow(new ConflictException(ErrorCodes.CLOCKING_MOVED_TO_FICHIT));
  });
});

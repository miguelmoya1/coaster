import type { User } from '@coaster/common';
import {
  ErrorCodes,
  Role,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  asBarId,
  asTimeEntryId,
  asUserId,
} from '@coaster/common';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestTimeCorrectionCommand } from '../impl/request-time-correction.command';
import { RequestTimeCorrectionHandler } from './request-time-correction.handler';

const barId = asBarId('bar-1');
const employee: User = {
  id: asUserId('user-1'),
  email: 'luis@bar.com',
  name: 'Luis',
  active: true,
  role: Role.USER,
  language: 'es',
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  rootId: 'entry-1',
  barId: 'bar-1',
  userId: 'user-1',
  userSnapshot: { name: 'Luis', email: 'luis@bar.com' },
  shiftId: null,
  type: TimeEntryType.CLOCK_IN,
  action: TimeEntryAction.RECORDED,
  occurredAt: new Date('2026-08-08T08:00:00Z'),
  recordedAt: new Date('2026-08-08T08:00:01Z'),
  workdayDate: new Date('2026-08-08T00:00:00Z'),
  source: TimeEntrySource.EMPLOYEE_DEVICE,
  latitude: null,
  longitude: null,
  supersedesId: null,
  supersededBy: null,
  actorId: 'user-1',
  reason: null,
  sequence: 1n,
  prevHash: 'prev',
  hash: 'hash-1',
  user: { id: 'user-1', name: 'Luis' },
  actor: { id: 'user-1', name: 'Luis' },
  ...overrides,
});

const command = (occurredAt = '2026-08-08T07:30:00Z') =>
  new RequestTimeCorrectionCommand(barId, asTimeEntryId('entry-1'), employee, {
    occurredAt,
    reason: 'Entre antes pero fiche tarde',
  });

describe('RequestTimeCorrectionHandler', () => {
  let handler: RequestTimeCorrectionHandler;
  let readRepo: {
    findCurrentById: ReturnType<typeof vi.fn>;
    findByWorkdayRange: ReturnType<typeof vi.fn>;
    findByRoots: ReturnType<typeof vi.fn>;
  };
  let writeRepo: { append: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = {
      findCurrentById: vi.fn().mockResolvedValue(row()),
      findByWorkdayRange: vi.fn().mockResolvedValue([row()]),
      findByRoots: vi.fn().mockResolvedValue([
        row(),
        row({
          id: 'entry-2',
          action: TimeEntryAction.REQUESTED,
          occurredAt: new Date('2026-08-08T07:30:00Z'),
          reason: 'Entre antes pero fiche tarde',
          sequence: 2n,
          hash: 'hash-2',
        }),
      ]),
    };
    writeRepo = { append: vi.fn().mockResolvedValue(row()) };
    handler = new RequestTimeCorrectionHandler(readRepo as never, writeRepo as never);
  });

  it('should record the request without superseding the mark', async () => {
    await handler.execute(command());

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: TimeEntryAction.REQUESTED,
        rootId: 'entry-1',
        occurredAt: new Date('2026-08-08T07:30:00Z'),
        reason: 'Entre antes pero fiche tarde',
        actorId: employee.id,
      }),
    );
    expect(writeRepo.append.mock.calls[0][0].supersedesId).toBeUndefined();
  });

  it('should leave the hour on the record untouched until somebody approves', async () => {
    const entry = await handler.execute(command());

    expect(entry.occurredAt).toBe('2026-08-08T08:00:00.000Z');
    expect(entry.amended).toBe(false);
    expect(entry.pendingRequest).toMatchObject({
      occurredAt: '2026-08-08T07:30:00.000Z',
      reason: 'Entre antes pero fiche tarde',
    });
  });

  it('should refuse to touch somebody elses mark', async () => {
    readRepo.findCurrentById.mockResolvedValue(row({ userId: 'user-9' }));

    await expect(handler.execute(command())).rejects.toThrow(new ForbiddenException(ErrorCodes.NOT_YOUR_TIME_ENTRY));
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should refuse an hour that would break the workday', async () => {
    readRepo.findByWorkdayRange.mockResolvedValue([
      row(),
      row({
        id: 'entry-9',
        rootId: 'entry-9',
        type: TimeEntryType.CLOCK_OUT,
        occurredAt: new Date('2026-08-08T16:00:00Z'),
        sequence: 2n,
      }),
    ]);

    await expect(handler.execute(command('2026-08-08T18:00:00Z'))).rejects.toThrow(
      new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE),
    );
  });

  it('should refuse to request a correction on a voided mark', async () => {
    readRepo.findCurrentById.mockResolvedValue(row({ action: TimeEntryAction.VOIDED }));

    await expect(handler.execute(command())).rejects.toThrow(
      new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT),
    );
  });
});

import type { User } from '@coaster/common';
import {
  ErrorCodes,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  asTimeEntryId,
  asUserId,
  Role,
  asEstablishmentId,
} from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryVoidedEvent } from '../../events/impl/time-entry-voided.event';
import { VoidTimeEntryCommand } from '../impl/void-time-entry.command';
import { VoidTimeEntryHandler } from './void-time-entry.handler';

const establishmentId = asEstablishmentId('establishment-1');
const actor: User = {
  id: asUserId('manager-1'),
  email: 'ana@establishment.com',
  name: 'Ana',
  active: true,
  role: Role.USER,
  language: 'es',
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  rootId: 'entry-1',
  establishmentId: 'establishment-1',
  userId: 'user-1',
  userSnapshot: { name: 'Luis', email: 'luis@establishment.com' },
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

const command = new VoidTimeEntryCommand(establishmentId, asTimeEntryId('entry-1'), actor, {
  reason: 'Fichaje duplicado por error del terminal',
});

describe('VoidTimeEntryHandler', () => {
  let handler: VoidTimeEntryHandler;
  let readRepo: {
    findCurrentById: ReturnType<typeof vi.fn>;
    findByWorkdayRange: ReturnType<typeof vi.fn>;
    findByRoots: ReturnType<typeof vi.fn>;
  };
  let writeRepo: { append: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = {
      findCurrentById: vi.fn().mockResolvedValue(row()),
      findByWorkdayRange: vi.fn().mockResolvedValue([row()]),
      findByRoots: vi
        .fn()
        .mockResolvedValue([
          row(),
          row({ id: 'entry-2', action: TimeEntryAction.VOIDED, supersedesId: 'entry-1', sequence: 2n, hash: 'hash-2' }),
        ]),
    };
    writeRepo = { append: vi.fn().mockResolvedValue(row({ id: 'entry-2' })) };
    eventBus = { publish: vi.fn() };
    handler = new VoidTimeEntryHandler(readRepo as never, writeRepo as never, eventBus as never);
  });

  it('should cancel the mark with a new revision that keeps the original hour', async () => {
    await handler.execute(command);

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: TimeEntryAction.VOIDED,
        supersedesId: 'entry-1',
        occurredAt: new Date('2026-08-08T08:00:00Z'),
        reason: 'Fichaje duplicado por error del terminal',
      }),
    );
  });

  it('should report the cancelled mark as voided', async () => {
    const entry = await handler.execute(command);

    expect(entry.voided).toBe(true);
    expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(TimeEntryVoidedEvent);
  });

  it('should refuse to void a clock in that would strand the clock out', async () => {
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

    await expect(handler.execute(command)).rejects.toThrow(new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE));
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should refuse to void a mark that was already voided', async () => {
    readRepo.findCurrentById.mockResolvedValue(row({ action: TimeEntryAction.VOIDED }));

    await expect(handler.execute(command)).rejects.toThrow(new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT));
  });
});

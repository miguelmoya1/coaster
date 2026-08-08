import type { User } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, TimeEntrySource, TimeEntryType, asUserId, Role, asBarId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryRecordedEvent } from '../../events/impl/time-entry-recorded.event';
import { ClockCommand } from '../impl/clock.command';
import { ClockHandler } from './clock.handler';

const barId = asBarId('bar-1');
const actor: User = {
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
  occurredAt: new Date('2026-08-08T20:00:00Z'),
  recordedAt: new Date('2026-08-08T20:00:01Z'),
  workdayDate: new Date('2026-08-08T00:00:00Z'),
  source: TimeEntrySource.EMPLOYEE_DEVICE,
  latitude: null,
  longitude: null,
  supersedesId: null,
  actorId: 'user-1',
  reason: null,
  sequence: 1n,
  prevHash: 'prev',
  hash: 'hash-1',
  user: { id: 'user-1', name: 'Luis' },
  actor: { id: 'user-1', name: 'Luis' },
  ...overrides,
});

describe('ClockHandler', () => {
  let handler: ClockHandler;
  let readRepo: { findByWorkdayRange: ReturnType<typeof vi.fn> };
  let writeRepo: { append: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T00:30:00Z'));

    readRepo = { findByWorkdayRange: vi.fn().mockResolvedValue([]) };
    writeRepo = { append: vi.fn().mockResolvedValue(row()) };
    eventBus = { publish: vi.fn() };
    handler = new ClockHandler(readRepo as never, writeRepo as never, eventBus as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should stamp the mark with the server clock, not with anything the client sends', async () => {
    await handler.execute(new ClockCommand(barId, actor, { type: TimeEntryType.CLOCK_IN }));

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: new Date('2026-08-09T00:30:00Z'),
        action: TimeEntryAction.RECORDED,
        source: TimeEntrySource.EMPLOYEE_DEVICE,
        userId: actor.id,
        actorId: actor.id,
      }),
    );
  });

  it('should keep a night shift on the workday it started', async () => {
    readRepo.findByWorkdayRange.mockResolvedValue([row()]);

    await handler.execute(new ClockCommand(barId, actor, { type: TimeEntryType.CLOCK_OUT }));

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ workdayDate: new Date('2026-08-08T00:00:00Z') }),
    );
  });

  it('should refuse a break from someone who never clocked in', async () => {
    await expect(handler.execute(new ClockCommand(barId, actor, { type: TimeEntryType.BREAK_START }))).rejects.toThrow(
      new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE),
    );
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should store the geolocation the device reported', async () => {
    await handler.execute(
      new ClockCommand(barId, actor, { type: TimeEntryType.CLOCK_IN, latitude: 40.41, longitude: -3.7 }),
    );

    expect(writeRepo.append).toHaveBeenCalledWith(expect.objectContaining({ latitude: 40.41, longitude: -3.7 }));
  });

  it('should announce the punch so the audit trail can pick it up', async () => {
    await handler.execute(new ClockCommand(barId, actor, { type: TimeEntryType.CLOCK_IN }));

    expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(TimeEntryRecordedEvent);
  });
});

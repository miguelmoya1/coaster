import type { User } from '@coaster/common';
import { ErrorCodes, TimeEntryAction, TimeEntrySource, TimeEntryType, asUserId, Role, asBarId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTimeEntryCommand } from '../impl/create-time-entry.command';
import { CreateTimeEntryHandler } from './create-time-entry.handler';

const barId = asBarId('bar-1');
const actor: User = {
  id: asUserId('manager-1'),
  email: 'ana@bar.com',
  name: 'Ana',
  active: true,
  role: Role.USER,
  language: 'es',
};
const member = { userId: 'user-1', userName: 'Luis', userEmail: 'luis@bar.com', active: true };

const row = {
  id: 'entry-1',
  rootId: 'entry-1',
  barId: 'bar-1',
  userId: 'user-1',
  userSnapshot: { name: 'Luis', email: 'luis@bar.com' },
  shiftId: null,
  type: TimeEntryType.CLOCK_IN,
  action: TimeEntryAction.RECORDED,
  occurredAt: new Date('2026-08-08T08:00:00Z'),
  recordedAt: new Date('2026-08-08T18:00:00Z'),
  workdayDate: new Date('2026-08-08T00:00:00Z'),
  source: TimeEntrySource.MANUAL,
  latitude: null,
  longitude: null,
  supersedesId: null,
  actorId: 'manager-1',
  reason: 'El terminal estaba caido',
  sequence: 1n,
  prevHash: 'prev',
  hash: 'hash-1',
  user: { id: 'user-1', name: 'Luis' },
  actor: { id: 'manager-1', name: 'Ana' },
};

const command = (overrides: Record<string, unknown> = {}) =>
  new CreateTimeEntryCommand(barId, actor, {
    userId: asUserId('user-1'),
    type: TimeEntryType.CLOCK_IN,
    occurredAt: '2026-08-08T08:00:00Z',
    reason: 'El terminal estaba caido',
    ...overrides,
  } as never);

describe('CreateTimeEntryHandler', () => {
  let handler: CreateTimeEntryHandler;
  let readRepo: { findByWorkdayRange: ReturnType<typeof vi.fn> };
  let writeRepo: { append: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = { findByWorkdayRange: vi.fn().mockResolvedValue([]) };
    writeRepo = { append: vi.fn().mockResolvedValue(row) };
    queryBus = { execute: vi.fn().mockResolvedValue([member]) };
    eventBus = { publish: vi.fn() };
    handler = new CreateTimeEntryHandler(readRepo as never, writeRepo as never, queryBus as never, eventBus as never);
  });

  it('should record the mark as manual and keep the stated reason', async () => {
    await handler.execute(command());

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        source: TimeEntrySource.MANUAL,
        action: TimeEntryAction.RECORDED,
        userId: 'user-1',
        actorId: actor.id,
        reason: 'El terminal estaba caido',
        userSnapshot: { name: 'Luis', email: 'luis@bar.com' },
      }),
    );
  });

  it('should refuse to invent hours for someone who does not work here', async () => {
    queryBus.execute.mockResolvedValue([]);

    await expect(handler.execute(command())).rejects.toThrow(new NotFoundException(ErrorCodes.MEMBER_NOT_FOUND));
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should refuse to add a mark that breaks the sequence of the day', async () => {
    await expect(handler.execute(command({ type: TimeEntryType.BREAK_END }))).rejects.toThrow(
      new BadRequestException(ErrorCodes.INVALID_CLOCK_SEQUENCE),
    );
  });
});

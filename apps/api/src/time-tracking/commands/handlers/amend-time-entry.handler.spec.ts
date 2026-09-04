import type { User } from '@coaster/common';
import {
  EstablishmentPermission,
  ErrorCodes,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  asTimeEntryId,
  asUserId,
  Role,
  asEstablishmentId,
} from '@coaster/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryAmendedEvent } from '../../events/impl/time-entry-amended.event';
import { AmendTimeEntryCommand } from '../impl/amend-time-entry.command';
import { AmendTimeEntryHandler } from './amend-time-entry.handler';

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

const command = (occurredAt = '2026-08-08T09:00:00Z') =>
  new AmendTimeEntryCommand(establishmentId, asTimeEntryId('entry-1'), actor, {
    occurredAt,
    reason: 'El trabajador olvido fichar la entrada',
  });

describe('AmendTimeEntryHandler', () => {
  let handler: AmendTimeEntryHandler;
  let readRepo: {
    findCurrentById: ReturnType<typeof vi.fn>;
    findByWorkdayRange: ReturnType<typeof vi.fn>;
    findByRoots: ReturnType<typeof vi.fn>;
  };
  let writeRepo: { append: ReturnType<typeof vi.fn> };
  let queryBus: { execute: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = {
      findCurrentById: vi.fn().mockResolvedValue(row()),
      findByWorkdayRange: vi.fn().mockResolvedValue([row()]),
      findByRoots: vi.fn().mockResolvedValue([
        row(),
        row({
          id: 'entry-2',
          action: TimeEntryAction.AMENDED,
          occurredAt: new Date('2026-08-08T09:00:00Z'),
          supersedesId: 'entry-1',
          sequence: 2n,
          hash: 'hash-2',
        }),
      ]),
    };
    writeRepo = { append: vi.fn().mockResolvedValue(row({ id: 'entry-2' })) };
    queryBus = {
      execute: vi
        .fn()
        .mockResolvedValue([
          { userId: 'manager-1', permissions: [EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES] },
        ]),
    };
    eventBus = { publish: vi.fn() };
    handler = new AmendTimeEntryHandler(readRepo as never, writeRepo as never, queryBus as never, eventBus as never);
  });

  it('should append a new revision instead of rewriting the original mark', async () => {
    await handler.execute(command());

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: TimeEntryAction.AMENDED,
        supersedesId: 'entry-1',
        rootId: 'entry-1',
        type: TimeEntryType.CLOCK_IN,
        occurredAt: new Date('2026-08-08T09:00:00Z'),
        reason: 'El trabajador olvido fichar la entrada',
        actorId: actor.id,
      }),
    );
  });

  it('should hand the auditor both the old hour and the new one', async () => {
    await handler.execute(command());

    const event = eventBus.publish.mock.calls[0][0] as TimeEntryAmendedEvent;

    expect(event).toBeInstanceOf(TimeEntryAmendedEvent);
    expect(event.previousOccurredAt).toBe('2026-08-08T08:00:00.000Z');
    expect(event.entry.occurredAt).toBe('2026-08-08T09:00:00.000Z');
    expect(event.entry.amended).toBe(true);
    expect(event.reason).toBe('El trabajador olvido fichar la entrada');
  });

  it('should keep the whole revision history on the amended mark', async () => {
    const entry = await handler.execute(command());

    expect(entry.revisions.map((revision) => revision.action)).toEqual([
      TimeEntryAction.RECORDED,
      TimeEntryAction.AMENDED,
    ]);
  });

  it('should refuse to amend a mark that is not the current one', async () => {
    readRepo.findCurrentById.mockResolvedValue(row({ supersededBy: { id: 'entry-2' } }));

    await expect(handler.execute(command())).rejects.toThrow(
      new BadRequestException(ErrorCodes.TIME_ENTRY_NOT_CURRENT),
    );
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should refuse to amend a mark that no longer exists', async () => {
    readRepo.findCurrentById.mockResolvedValue(null);

    await expect(handler.execute(command())).rejects.toThrow(new NotFoundException(ErrorCodes.TIME_ENTRY_NOT_FOUND));
  });

  it('should refuse an hour that would leave the day out of order', async () => {
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
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should refuse an unparseable hour', async () => {
    await expect(handler.execute(command('ayer por la tarde'))).rejects.toThrow(
      new BadRequestException(ErrorCodes.INVALID_DATE),
    );
  });

  it('should let a worker fix the hour on a mark of their own', async () => {
    const worker: User = { ...actor, id: asUserId('user-1'), name: 'Luis', email: 'luis@establishment.com' };
    queryBus.execute.mockResolvedValue([{ userId: 'user-1', permissions: [] }]);

    await handler.execute(
      new AmendTimeEntryCommand(establishmentId, asTimeEntryId('entry-1'), worker, {
        occurredAt: '2026-08-08T09:00:00Z',
        reason: 'Entre antes pero fiche tarde',
      }),
    );

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: TimeEntryAction.AMENDED, actorId: worker.id }),
    );
  });

  it('should stop a worker from touching somebody elses hours', async () => {
    const worker: User = { ...actor, id: asUserId('user-9'), name: 'Marta', email: 'marta@establishment.com' };
    queryBus.execute.mockResolvedValue([{ userId: 'user-9', permissions: [] }]);

    await expect(
      handler.execute(
        new AmendTimeEntryCommand(establishmentId, asTimeEntryId('entry-1'), worker, {
          occurredAt: '2026-08-08T09:00:00Z',
          reason: 'Le puse la hora que me dijo',
        }),
      ),
    ).rejects.toThrow(new ForbiddenException(ErrorCodes.NOT_YOUR_TIME_ENTRY));
    expect(writeRepo.append).not.toHaveBeenCalled();
  });

  it('should let whoever manages the establishment fix anybody hours', async () => {
    await handler.execute(command());

    expect(writeRepo.append).toHaveBeenCalledWith(expect.objectContaining({ actorId: actor.id }));
  });
});

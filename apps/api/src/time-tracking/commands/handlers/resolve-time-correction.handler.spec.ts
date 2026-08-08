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
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryAmendedEvent } from '../../events/impl/time-entry-amended.event';
import { ResolveTimeCorrectionCommand } from '../impl/resolve-time-correction.command';
import { ResolveTimeCorrectionHandler } from './resolve-time-correction.handler';

const barId = asBarId('bar-1');
const manager: User = {
  id: asUserId('manager-1'),
  email: 'ana@bar.com',
  name: 'Ana',
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

const pendingRequest = row({
  id: 'entry-2',
  action: TimeEntryAction.REQUESTED,
  occurredAt: new Date('2026-08-08T07:30:00Z'),
  recordedAt: new Date('2026-08-08T18:00:00Z'),
  reason: 'Entre antes pero fiche tarde',
  actorId: 'user-1',
  sequence: 2n,
  hash: 'hash-2',
});

const command = (approved: boolean, reason?: string) =>
  new ResolveTimeCorrectionCommand(barId, asTimeEntryId('entry-1'), manager, approved, { reason });

describe('ResolveTimeCorrectionHandler', () => {
  let handler: ResolveTimeCorrectionHandler;
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
      findByWorkdayRange: vi.fn().mockResolvedValue([row(), pendingRequest]),
      findByRoots: vi.fn().mockResolvedValue([
        row(),
        pendingRequest,
        row({
          id: 'entry-3',
          action: TimeEntryAction.AMENDED,
          occurredAt: new Date('2026-08-08T07:30:00Z'),
          supersedesId: 'entry-1',
          sequence: 3n,
          hash: 'hash-3',
        }),
      ]),
    };
    writeRepo = { append: vi.fn().mockResolvedValue(row()) };
    eventBus = { publish: vi.fn() };
    handler = new ResolveTimeCorrectionHandler(readRepo as never, writeRepo as never, eventBus as never);
  });

  it('should apply the requested hour when it is approved', async () => {
    await handler.execute(command(true));

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: TimeEntryAction.AMENDED,
        supersedesId: 'entry-1',
        occurredAt: new Date('2026-08-08T07:30:00Z'),
        actorId: manager.id,
        reason: 'Entre antes pero fiche tarde',
      }),
    );
  });

  it('should keep the employee reason unless the manager writes their own', async () => {
    await handler.execute(command(true, 'Confirmado con el encargado de sala'));

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Confirmado con el encargado de sala' }),
    );
  });

  it('should announce the change so the audit trail picks it up', async () => {
    await handler.execute(command(true));

    const event = eventBus.publish.mock.calls[0][0] as TimeEntryAmendedEvent;

    expect(event).toBeInstanceOf(TimeEntryAmendedEvent);
    expect(event.previousOccurredAt).toBe('2026-08-08T08:00:00.000Z');
  });

  it('should leave the hour alone when it is rejected, but write the refusal down', async () => {
    readRepo.findByRoots.mockResolvedValue([
      row(),
      pendingRequest,
      row({
        id: 'entry-3',
        action: TimeEntryAction.REJECTED,
        occurredAt: new Date('2026-08-08T07:30:00Z'),
        reason: 'No cuadra con la caja',
        sequence: 3n,
        hash: 'hash-3',
      }),
    ]);

    const entry = await handler.execute(command(false, 'No cuadra con la caja'));

    expect(writeRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: TimeEntryAction.REJECTED, reason: 'No cuadra con la caja' }),
    );
    expect(writeRepo.append.mock.calls[0][0].supersedesId).toBeUndefined();
    expect(entry.occurredAt).toBe('2026-08-08T08:00:00.000Z');
    expect(entry.pendingRequest).toBeNull();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should refuse to resolve a mark nobody asked to correct', async () => {
    readRepo.findByWorkdayRange.mockResolvedValue([row()]);

    await expect(handler.execute(command(true))).rejects.toThrow(
      new BadRequestException(ErrorCodes.NO_PENDING_TIME_CORRECTION),
    );
    expect(writeRepo.append).not.toHaveBeenCalled();
  });
});

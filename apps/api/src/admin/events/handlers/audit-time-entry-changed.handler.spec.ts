import {
  AdminAuditAction,
  AdminAuditTargetType,
  Role,
  TimeEntry,
  TimeEntrySource,
  TimeEntryType,
  asBarId,
  asTimeEntryId,
  asUserId,
} from '@coaster/common';
import { TimeEntryAmendedEvent, TimeEntryRecordedEvent, TimeEntryVoidedEvent } from '@coaster/time-tracking';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminActionEvent } from '../impl/admin-action.event';
import { AuditTimeEntryChangedHandler } from './audit-time-entry-changed.handler';

const barId = asBarId('bar-1');
const admin = asUserId('admin-1');

const entry = (overrides: Partial<TimeEntry> = {}): TimeEntry =>
  ({
    id: asTimeEntryId('entry-2'),
    rootId: asTimeEntryId('entry-1'),
    barId,
    userId: asUserId('user-1'),
    userName: 'Luis',
    type: TimeEntryType.CLOCK_IN,
    occurredAt: '2026-08-08T09:00:00.000Z',
    recordedAt: '2026-08-08T18:00:00.000Z',
    workdayDate: '2026-08-08',
    source: TimeEntrySource.EMPLOYEE_DEVICE,
    amended: true,
    voided: false,
    revisions: [],
    ...overrides,
  }) as TimeEntry;

describe('AuditTimeEntryChangedHandler', () => {
  let handler: AuditTimeEntryChangedHandler;
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    eventBus = { publish: vi.fn() };
    handler = new AuditTimeEntryChangedHandler(eventBus as never);
  });

  it('should log an amendment made by a platform admin', () => {
    handler.handle(new TimeEntryAmendedEvent(barId, entry(), '2026-08-08T08:00:00.000Z', admin, Role.ADMIN, 'Olvido'));

    const published = eventBus.publish.mock.calls[0][0] as AdminActionEvent;

    expect(published).toBeInstanceOf(AdminActionEvent);
    expect(published.entry).toMatchObject({
      actorId: admin,
      action: AdminAuditAction.TIME_ENTRY_AMENDED,
      targetType: AdminAuditTargetType.TIME_ENTRY,
      targetId: 'entry-1',
      targetLabel: 'Luis · 2026-08-08',
      reason: 'Olvido',
    });
    expect(published.entry.metadata).toMatchObject({
      previousOccurredAt: '2026-08-08T08:00:00.000Z',
      occurredAt: '2026-08-08T09:00:00.000Z',
    });
  });

  it('should log a voided mark as its own action', () => {
    handler.handle(new TimeEntryVoidedEvent(barId, entry({ voided: true }), admin, Role.ADMIN, 'Duplicado'));

    expect((eventBus.publish.mock.calls[0][0] as AdminActionEvent).entry.action).toBe(
      AdminAuditAction.TIME_ENTRY_VOIDED,
    );
  });

  it('should log a manual entry created by an admin', () => {
    const manual = entry({ source: TimeEntrySource.MANUAL, amended: false });

    handler.handle(new TimeEntryRecordedEvent(barId, manual, admin, Role.ADMIN, 'Terminal caido'));

    expect((eventBus.publish.mock.calls[0][0] as AdminActionEvent).entry.action).toBe(
      AdminAuditAction.TIME_ENTRY_CREATED,
    );
  });

  it('should stay out of the backoffice log when an admin simply clocks in', () => {
    handler.handle(new TimeEntryRecordedEvent(barId, entry({ amended: false }), admin, Role.ADMIN, null));

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should ignore anything a bar manager does', () => {
    handler.handle(
      new TimeEntryAmendedEvent(barId, entry(), '2026-08-08T08:00:00.000Z', asUserId('manager-1'), Role.USER, 'Olvido'),
    );

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

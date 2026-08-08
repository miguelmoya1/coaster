import type { TimeCorrectionRequest, TimeEntry, TimeEntryRevision } from '@coaster/common';
import {
  APPLIED_ACTIONS,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
  asBarId,
  asShiftId,
  asTimeEntryId,
  asUserId,
} from '@coaster/common';
import type { DbTimeEntry } from '@coaster/core/db';
import { formatWorkdayDate } from '../domain/workday';

export type TimeEntryRow = DbTimeEntry & {
  user?: { id: string; name: string } | null;
  actor?: { id: string; name: string } | null;
};

const userSnapshotName = (row: TimeEntryRow): string => {
  const snapshot = row.userSnapshot as { name?: string } | null;
  return row.user?.name ?? snapshot?.name ?? '';
};

const toRevision = (row: TimeEntryRow): TimeEntryRevision => ({
  id: asTimeEntryId(row.id),
  action: row.action as TimeEntryAction,
  type: row.type as TimeEntryType,
  occurredAt: row.occurredAt.toISOString(),
  recordedAt: row.recordedAt.toISOString(),
  source: row.source as TimeEntrySource,
  actorId: asUserId(row.actorId),
  actorName: row.actor?.name ?? null,
  reason: row.reason,
  hash: row.hash,
});

const bySequence = (a: TimeEntryRow, b: TimeEntryRow) => Number(a.sequence - b.sequence);

const isApplied = (row: TimeEntryRow) => (APPLIED_ACTIONS as readonly string[]).includes(row.action);

const toPendingRequest = (row: TimeEntryRow): TimeCorrectionRequest => ({
  id: asTimeEntryId(row.id),
  occurredAt: row.occurredAt.toISOString(),
  requestedAt: row.recordedAt.toISOString(),
  requestedById: asUserId(row.actorId),
  requestedByName: row.actor?.name ?? null,
  reason: row.reason,
});

export const TimeEntriesMapper = {
  toDomain(revisions: TimeEntryRow[]): TimeEntry {
    const ordered = [...revisions].sort(bySequence);
    const applied = ordered.filter(isApplied);
    const original = applied[0] ?? ordered[0];
    const head = applied[applied.length - 1] ?? ordered[ordered.length - 1];
    const last = ordered[ordered.length - 1];

    return {
      id: asTimeEntryId(head.id),
      rootId: asTimeEntryId(head.rootId),
      barId: asBarId(head.barId),
      userId: asUserId(head.userId),
      userName: userSnapshotName(head),
      type: head.type as TimeEntryType,
      occurredAt: head.occurredAt.toISOString(),
      recordedAt: head.recordedAt.toISOString(),
      workdayDate: formatWorkdayDate(head.workdayDate),
      source: head.source as TimeEntrySource,
      amended: applied.length > 1,
      voided: head.action === TimeEntryAction.VOIDED,
      latitude: original.latitude ?? undefined,
      longitude: original.longitude ?? undefined,
      shiftId: original.shiftId ? asShiftId(original.shiftId) : undefined,
      pendingRequest: last.action === TimeEntryAction.REQUESTED ? toPendingRequest(last) : null,
      revisions: ordered.map(toRevision),
    };
  },

  groupByRoot(rows: TimeEntryRow[]): TimeEntry[] {
    const groups = new Map<string, TimeEntryRow[]>();

    for (const row of rows) {
      const group = groups.get(row.rootId);

      if (group) {
        group.push(row);
      } else {
        groups.set(row.rootId, [row]);
      }
    }

    return [...groups.values()]
      .map((group) => TimeEntriesMapper.toDomain(group))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  },

  toDto(entry: TimeEntry): TimeEntry {
    return entry;
  },
};

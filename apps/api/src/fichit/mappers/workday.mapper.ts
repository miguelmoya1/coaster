import type { EstablishmentId, TimeEntry, UserId, Workday } from '@coaster/common';
import { ClockState, TimeEntryAction, TimeEntrySource, TimeEntryType, WorkdayDiscrepancy } from '@coaster/common';
import type { FichitDay, FichitEmployeeMonth, FichitPunch } from '../services/fichit-timesheet.types';

const minutes = (hours: number) => Math.round(hours * 60);

const PUNCH_TYPE: Record<string, TimeEntryType> = {
  in: TimeEntryType.CLOCK_IN,
  out: TimeEntryType.CLOCK_OUT,
  break_start: TimeEntryType.BREAK_START,
  break_end: TimeEntryType.BREAK_END,
};

const SOURCE: Record<string, TimeEntrySource> = {
  kiosk: TimeEntrySource.EMPLOYEE_DEVICE,
  web: TimeEntrySource.EMPLOYEE_DEVICE,
  manual: TimeEntrySource.MANUAL,
  integration: TimeEntrySource.MANUAL,
};

const ACTION: Record<string, TimeEntryAction> = {
  original: TimeEntryAction.RECORDED,
  correction: TimeEntryAction.AMENDED,
  void: TimeEntryAction.VOIDED,
};

const stateOf = (day: FichitDay): ClockState => {
  const running = day.sessions.find((session) => session.open);
  if (!running) {
    return ClockState.OUT;
  }
  return running.breaks.some((rest) => !rest.end) ? ClockState.ON_BREAK : ClockState.IN;
};

const discrepanciesOf = (day: FichitDay): WorkdayDiscrepancy[] => {
  const found: WorkdayDiscrepancy[] = [];
  const planned = day.shifts?.length ?? 0;
  if (planned > 0 && day.worked_hours === 0) {
    found.push(WorkdayDiscrepancy.NO_SHOW);
  }
  if (planned === 0 && day.worked_hours > 0) {
    found.push(WorkdayDiscrepancy.UNPLANNED);
  }
  if (planned > 0 && day.variance_hours > 0) {
    found.push(WorkdayDiscrepancy.OVERTIME);
  }
  if (planned > 0 && day.worked_hours > 0 && day.variance_hours < 0) {
    found.push(WorkdayDiscrepancy.EARLY_FINISH);
  }

  return [...new Set(found)];
};

export const toPunchKind = (type: string): string =>
  Object.entries(PUNCH_TYPE).find(([, value]) => value === type)?.[0] ?? 'in';

export const toWorkday = (employee: FichitEmployeeMonth, day: FichitDay, userId: UserId): Workday => ({
  date: day.date,
  userId,
  userName: employee.employee_name,
  state: stateOf(day),
  workedMinutes: minutes(day.worked_hours),
  breakMinutes: minutes(day.break_hours),
  plannedMinutes: day.shifts?.length ? minutes(day.planned_hours) : null,
  plannedStart: day.shifts?.[0]?.starts_at ?? null,
  plannedEnd: day.shifts?.[0]?.ends_at ?? null,
  discrepancies: discrepanciesOf(day),
  entries: [],
});

export const toTimeEntry = (
  punch: FichitPunch,
  establishmentId: EstablishmentId,
  userId: UserId,
  userName: string,
): TimeEntry => ({
  id: punch.id as TimeEntry['id'],
  rootId: (punch.supersedes_id ?? punch.id) as TimeEntry['rootId'],
  establishmentId,
  userId,
  userName,
  type: PUNCH_TYPE[punch.kind] ?? TimeEntryType.CLOCK_IN,
  occurredAt: punch.occurred_at,
  recordedAt: punch.recorded_at,
  workdayDate: punch.occurred_at.slice(0, 10),
  source: SOURCE[punch.source] ?? TimeEntrySource.MANUAL,
  amended: punch.entry_type === 'correction',
  voided: punch.entry_type === 'void',
  latitude: punch.latitude,
  longitude: punch.longitude,
  revisions: [
    {
      id: punch.id as TimeEntry['id'],
      action: ACTION[punch.entry_type] ?? TimeEntryAction.RECORDED,
      type: PUNCH_TYPE[punch.kind] ?? TimeEntryType.CLOCK_IN,
      occurredAt: punch.occurred_at,
      recordedAt: punch.recorded_at,
      source: SOURCE[punch.source] ?? TimeEntrySource.MANUAL,
      actorId: userId,
      actorName: userName || null,
      reason: punch.reason ?? null,
      hash: punch.hash,
    },
  ],
});

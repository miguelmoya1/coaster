import { ClockState, TimeEntryType } from '@coaster/common';
import { Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';

const TRANSITIONS: Record<string, Partial<Record<string, ClockState>>> = {
  [ClockState.OUT]: { [TimeEntryType.CLOCK_IN]: ClockState.IN },
  [ClockState.IN]: { [TimeEntryType.BREAK_START]: ClockState.ON_BREAK, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
  [ClockState.ON_BREAK]: { [TimeEntryType.BREAK_END]: ClockState.IN, [TimeEntryType.CLOCK_OUT]: ClockState.OUT },
};

export interface Mark {
  type: TimeEntryType;
  workdayDate: string;
  occurredAt: string;
}

const stateOf = (marks: Mark[]): ClockState | null =>
  marks.reduce<ClockState | null>(
    (state, mark) => (state === null ? null : (TRANSITIONS[state][mark.type] ?? null)),
    ClockState.OUT,
  );

const dayIn = (timeZone: string, instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;

  return `${value('year')}-${value('month')}-${value('day')}`;
};

/**
 * A stand-in for the time-entries endpoints that keeps the two rules the screen depends on: a punch
 * joins the previous day while that day is still open, and a day is only handed back for the range
 * that was asked for. Without both, a screen that reads the wrong day still looks right here.
 */
export async function mockTimeTracking(
  page: Page,
  initialMarks: Mark[] = [],
  now: () => Date = () => new Date(),
  timeZone = 'Europe/Madrid',
) {
  const marks = [...initialMarks];

  const today = () => dayIn(timeZone, now());
  const yesterday = () => dayIn(timeZone, new Date(now().getTime() - 24 * 60 * 60 * 1000));
  const marksOf = (day: string) => marks.filter((mark) => mark.workdayDate === day);

  /** The server stops adding punches to a day once the night it ran into is over; so does this. */
  const stillNight = () =>
    Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).format(now())) < 6;

  const workdayFor = (day: string) => {
    const of = marksOf(day);

    return {
      date: day,
      userId: 'test-user-123',
      userName: 'Test User',
      state: stateOf(of) ?? ClockState.OUT,
      workedMinutes: 0,
      breakMinutes: 0,
      plannedMinutes: null,
      plannedStart: null,
      plannedEnd: null,
      discrepancies: [],
      entries: of.map((mark, index) => ({
        id: `entry-${day}-${index}`,
        type: mark.type,
        action: 'RECORDED',
        occurredAt: mark.occurredAt,
        workdayDate: day,
        source: 'EMPLOYEE_DEVICE',
        userName: 'Test User',
        voided: false,
        revisions: [],
      })),
    };
  };

  await page.route(
    (url) => url.toString().startsWith(`${API_BASE}/establishments/establishment-123/time-entries`),
    async (route) => {
      const method = route.request().method();
      const headers = { 'Access-Control-Allow-Origin': '*' };

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': '*' } });
        return;
      }

      const url = new URL(route.request().url());

      if (method === 'POST' && url.pathname.endsWith('/clock')) {
        const { type } = route.request().postDataJSON() as { type: TimeEntryType };
        const openedYesterday = stateOf(marksOf(yesterday()));
        const inherits = stillNight() && openedYesterday !== null && openedYesterday !== ClockState.OUT;
        const day = inherits ? yesterday() : today();

        if (!stateOf([...marksOf(day), { type, workdayDate: day, occurredAt: now().toISOString() }])) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            headers,
            body: JSON.stringify({ message: ['INVALID_CLOCK_SEQUENCE'] }),
          });
          return;
        }

        marks.push({ type, workdayDate: day, occurredAt: new Date().toISOString() });
        await route.fulfill({ status: 201, contentType: 'application/json', headers, body: '{}' });
        return;
      }

      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const days = [...new Set(marks.map((mark) => mark.workdayDate))]
        .filter((day) => (!from || day >= from) && (!to || day <= to))
        .sort((a, b) => b.localeCompare(a));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(days.map(workdayFor)),
      });
    },
  );

  return {
    today,
    yesterday,
    marks: () => [...marks],
  };
}

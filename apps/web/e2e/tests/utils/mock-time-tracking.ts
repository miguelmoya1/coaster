import { ClockState, isOpen, replayClockState, TimeEntryType, workdayDateOf } from '@coaster/common';
import { Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';

export interface Mark {
  type: TimeEntryType;
  workdayDate: string;
  occurredAt: string;
}

const stateOf = (marks: Mark[]): ClockState | null => replayClockState(marks.map((mark) => mark.type));

/**
 * A stand-in for the time-entries endpoints that keeps the one rule the screen depends on: a punch
 * continues the workday that is still open, whatever day that is, and otherwise starts today.
 */
export async function mockTimeTracking(page: Page, initialMarks: Mark[] = [], now: () => Date = () => new Date()) {
  const marks = [...initialMarks];

  const today = () => workdayDateOf(now());
  const days = () => [...new Set(marks.map((mark) => mark.workdayDate))].sort().reverse();
  const marksOf = (day: string) => marks.filter((mark) => mark.workdayDate === day);
  const openDay = () => days().find((day) => isOpen(stateOf(marksOf(day))));

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
        const day = openDay() ?? today();

        if (!stateOf([...marksOf(day), { type, workdayDate: day, occurredAt: now().toISOString() }])) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            headers,
            body: JSON.stringify({ message: ['INVALID_CLOCK_SEQUENCE'] }),
          });
          return;
        }

        marks.push({ type, workdayDate: day, occurredAt: now().toISOString() });
        await route.fulfill({ status: 201, contentType: 'application/json', headers, body: '{}' });
        return;
      }

      if (url.pathname.endsWith('/me/current')) {
        const day = openDay() ?? today();

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(marksOf(day).length > 0 ? workdayFor(day) : null),
        });
        return;
      }

      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(
          days()
            .filter((day) => (!from || day >= from) && (!to || day <= to))
            .map(workdayFor),
        ),
      });
    },
  );

  return {
    today,
    marks: () => [...marks],
    punchBehindTheCardsBack: (type: TimeEntryType) =>
      marks.push({ type, workdayDate: openDay() ?? today(), occurredAt: now().toISOString() }),
  };
}

import { EstablishmentRole, TimeEntryType, workdayDateOf } from '@coaster/common';
import { expect, Page, test } from '@playwright/test';
import { mockApiResponse, mockMyMemberRole } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';
import { Mark, mockTimeTracking } from './utils/mock-time-tracking';

const ESTABLISHMENT_ID = 'establishment-123';
const SCHEDULE = `/establishments/${ESTABLISHMENT_ID}/schedule`;

const establishment = { id: ESTABLISHMENT_ID, name: 'The Bar', active: true };

const OUT = /fuera/i;
const WORKING = /trabajando/i;
const ON_BREAK = /en pausa/i;

const clockCard = (page: Page) => page.getByLabel('Fichaje');
const stateBadge = (page: Page) => clockCard(page).locator('[aria-live="polite"]');
const punch = (page: Page, label: string) => clockCard(page).getByRole('button', { name: label });

/* Madrid runs two hours ahead of UTC in August, so 08:00Z is mid-morning. */
const MID_MORNING = new Date('2026-08-15T08:00:00.000Z');

const theDayBefore = (instant: Date) => workdayDateOf(new Date(instant.getTime() - 24 * 60 * 60 * 1000));

const openScheduleWith = async (page: Page, marks: Mark[] = [], now = MID_MORNING) => {
  let clock!: Awaited<ReturnType<typeof mockTimeTracking>>;

  /* Pinned so the workday the screen lands on does not depend on when the suite happens to run. */
  await page.clock.setFixedTime(now);

  /* The punch asks the browser where it is; without an answer every click waits out its 3s timeout. */
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 40.4168, longitude: -3.7038 });

  /* The page slides in and the buttons swap as the state changes; animation makes clicks race. */
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
      document.head.appendChild(style);
    });
  });

  await loginAsTestUser(page, SCHEDULE, async (mocked) => {
    await mockMyMemberRole(mocked, EstablishmentRole.OWNER);
    await mockApiResponse(mocked, '/establishments', 'GET', [establishment]);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}`, 'GET', establishment);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/shifts`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/members`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/exchanges`, 'GET', []);
    clock = await mockTimeTracking(mocked, marks, () => now);
  });

  await expect(clockCard(page)).toBeVisible();

  return clock;
};

test.describe('Clocking in and out', () => {
  test('should carry a worker through a whole shift: in, break, back and out', async ({ page }) => {
    await openScheduleWith(page);

    await expect(stateBadge(page)).toContainText(OUT);
    await expect(punch(page, 'Fichar entrada')).toBeVisible();

    await punch(page, 'Fichar entrada').click();

    await expect(stateBadge(page)).toContainText(WORKING);
    await expect(punch(page, 'Iniciar pausa')).toBeVisible();
    await expect(punch(page, 'Fichar salida')).toBeVisible();
    await expect(punch(page, 'Fichar entrada')).toHaveCount(0);

    await punch(page, 'Iniciar pausa').click();

    await expect(stateBadge(page)).toContainText(ON_BREAK);
    await expect(punch(page, 'Terminar pausa')).toBeVisible();

    await punch(page, 'Terminar pausa').click();

    await expect(stateBadge(page)).toContainText(WORKING);
    await expect(punch(page, 'Iniciar pausa')).toBeVisible();

    await punch(page, 'Fichar salida').click();

    await expect(stateBadge(page)).toContainText(OUT);
    await expect(punch(page, 'Fichar entrada')).toBeVisible();
    await expect(punch(page, 'Fichar salida')).toHaveCount(0);
  });

  test('should never leave the card claiming the worker is out while a punch is on the record', async ({ page }) => {
    const clock = await openScheduleWith(page);

    await punch(page, 'Fichar entrada').click();
    await expect(stateBadge(page)).toContainText(WORKING);

    expect(clock.marks()).toHaveLength(1);
    expect(clock.marks()[0]).toMatchObject({ type: TimeEntryType.CLOCK_IN, workdayDate: clock.today() });
  });
});

test.describe('Clocking across days', () => {
  const openedTheDayBefore = (instant: Date): Mark[] => [
    {
      type: TimeEntryType.CLOCK_IN,
      workdayDate: theDayBefore(instant),
      occurredAt: `${theDayBefore(instant)}T20:00:00.000Z`,
    },
  ];

  test('should let a shift left open overnight carry on and clock out the next morning', async ({ page }) => {
    const yesterday = theDayBefore(MID_MORNING);
    const clock = await openScheduleWith(page, openedTheDayBefore(MID_MORNING), MID_MORNING);

    await expect(stateBadge(page)).toContainText(WORKING);
    await expect(punch(page, 'Fichar entrada')).toHaveCount(0);

    await punch(page, 'Fichar salida').click();

    await expect(stateBadge(page)).toContainText(OUT);
    expect(clock.marks().filter((mark) => mark.workdayDate === yesterday)).toHaveLength(2);
    expect(clock.marks().filter((mark) => mark.workdayDate === clock.today())).toHaveLength(0);
  });

  test('should correct itself when the card is out of step with the server', async ({ page }) => {
    const clock = await openScheduleWith(page, [], MID_MORNING);

    /* The card loaded while the punch already on the server was unreachable, so it offers the wrong
     * action. Pressing it is refused, and that refusal is what tells the card to go and look again. */
    await expect(punch(page, 'Fichar entrada')).toBeVisible();
    clock.punchBehindTheCardsBack(TimeEntryType.CLOCK_IN);

    await punch(page, 'Fichar entrada').click();

    await expect(stateBadge(page)).toContainText(WORKING);
    await expect(punch(page, 'Fichar salida')).toBeVisible();
    await expect(punch(page, 'Fichar entrada')).toHaveCount(0);
  });

  test('should start a fresh day only once the open one has been closed', async ({ page }) => {
    const clock = await openScheduleWith(page, openedTheDayBefore(MID_MORNING), MID_MORNING);

    await punch(page, 'Fichar salida').click();
    await expect(stateBadge(page)).toContainText(OUT);

    await punch(page, 'Fichar entrada').click();

    await expect(stateBadge(page)).toContainText(WORKING);
    expect(clock.marks().filter((mark) => mark.workdayDate === clock.today())).toHaveLength(1);
  });
});

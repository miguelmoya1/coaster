import { EstablishmentRole } from '@coaster/common';
import { expect, Page, test } from '@playwright/test';
import { mockApiResponse, mockMyMemberRole } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

const ESTABLISHMENT_ID = 'establishment-123';
const DASHBOARD = `/establishments/${ESTABLISHMENT_ID}/dashboard`;

const MONEY_WIDGETS = ['widget-today-takings', 'widget-weekly-chart', 'widget-revenue-history', 'widget-subscription'];

const stats = {
  todayRevenue: 84700,
  yesterdayRevenue: 75000,
  sameWeekdayLastWeekRevenue: 70000,
  weeklyRevenue: 320000,
  dailyRevenues: [{ dayName: 'Lun', amount: 84700, dateStr: '2026-08-10' }],
  todayTicketCount: 42,
  todayAverageTicket: 2016,
  todayCashRevenue: 50000,
  todayCardRevenue: 34700,
  todayTipAmount: 1200,
  history: {
    currentMonthRevenue: 1200000,
    previousMonthRevenue: 1100000,
    yearlyRevenue: 9800000,
    monthlyBreakdown: [{ monthIndex: 7, monthName: 'Ago', amount: 1200000 }],
    percentageChange: 9,
    isPositiveChange: true,
    maxMonthRevenue: 1200000,
  },
};

const establishment = { id: ESTABLISHMENT_ID, name: 'The Bar', active: true };

/**
 * Every call the dashboard makes has to be mocked: a single 401 bounces the session back to the
 * establishment picker, and the assertions would then pass against a page that has no widgets at all.
 */
const openDashboardAs = async (page: Page, role: EstablishmentRole, statsBody: unknown = stats) => {
  await loginAsTestUser(page, DASHBOARD, async (mocked) => {
    await mockMyMemberRole(mocked, role);
    await mockApiResponse(mocked, '/establishments', 'GET', [establishment]);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}`, 'GET', establishment);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/stats`, 'GET', statsBody);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/products`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/shifts`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/time-entries/me`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/categories`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/tables`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/orders`, 'GET', []);
  });

  await expect(page.getByTestId('dashboard-page')).toBeVisible();
};

test.describe('Dashboard per role', () => {
  test('should land every role on the dashboard, never bouncing them elsewhere', async ({ page }) => {
    for (const role of [EstablishmentRole.OWNER, EstablishmentRole.MANAGER, EstablishmentRole.STAFF]) {
      await openDashboardAs(page, role);

      await expect(page).toHaveURL(new RegExp(`${ESTABLISHMENT_ID}/dashboard`));
    }
  });

  test.describe('OWNER', () => {
    test('should see the takings, the history and the plan', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.OWNER);

      await expect(page.getByTestId('widget-today-takings')).toBeVisible();
      await expect(page.getByTestId('widget-revenue-history')).toBeVisible();
      await expect(page.getByTestId('widget-subscription')).toBeVisible();
    });
  });

  test.describe('MANAGER', () => {
    test('should see the daily takings', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.MANAGER);

      await expect(page.getByTestId('widget-today-takings')).toBeVisible();
    });

    test('should be shown neither the yearly history nor the billing card', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.MANAGER);

      await expect(page.getByTestId('widget-today-takings')).toBeVisible();
      await expect(page.getByTestId('widget-revenue-history')).toHaveCount(0);
      await expect(page.getByTestId('widget-subscription')).toHaveCount(0);
    });
  });

  test.describe('STAFF', () => {
    test('should get their own workday', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.STAFF);

      await expect(page.getByTestId('widget-my-shift')).toBeVisible();
    });

    test('should be shown no money anywhere on the page', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.STAFF);

      await expect(page.getByTestId('widget-my-shift')).toBeVisible();

      for (const widget of MONEY_WIDGETS) {
        await expect(page.getByTestId(widget)).toHaveCount(0);
      }
    });

    test('should never put a revenue figure in the page for a staff member to read', async ({ page }) => {
      await openDashboardAs(page, EstablishmentRole.STAFF);

      await expect(page.getByTestId('widget-my-shift')).toBeVisible();

      const body = (await page.locator('body').innerText()).replace(/\s/g, '');

      expect(body).not.toContain('847');
      expect(body).not.toContain('98.000');
      expect(body).not.toContain('12.000');
    });
  });
});

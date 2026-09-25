import { EstablishmentRole, TableStatus } from '@coaster/common';
import { expect, test } from '@playwright/test';
import { mockApiResponse, mockMyMemberRole } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

const ESTABLISHMENT_ID = 'establishment-123';
const TABLES = `/establishments/${ESTABLISHMENT_ID}/orders/tables`;

test.describe('Navigation that never waits for the data', () => {
  test('should open the page at once and fill it in when the data arrives', async ({ page }) => {
    let release!: () => void;
    const slowTables = new Promise<void>((resolve) => (release = resolve));

    await loginAsTestUser(page, `/establishments/${ESTABLISHMENT_ID}/orders/history`, async (mocked) => {
      await mockMyMemberRole(mocked, EstablishmentRole.OWNER);
      await mockApiResponse(mocked, '/establishments', 'GET', [{ id: ESTABLISHMENT_ID, name: 'The Bar' }]);
      await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}`, 'GET', {
        id: ESTABLISHMENT_ID,
        name: 'The Bar',
      });
      await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/orders`, 'GET', []);
      await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/products`, 'GET', []);
      await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/categories`, 'GET', []);
      await mocked.route(`**/api/v1/establishments/${ESTABLISHMENT_ID}/tables`, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fallback();
          return;
        }

        await slowTables;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:4200',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify([
            { id: 'table-1', establishmentId: ESTABLISHMENT_ID, name: 'Terraza 1', status: TableStatus.FREE },
          ]),
        });
      });
    });

    await page.getByRole('link', { name: 'Mesas' }).first().click();

    await expect(page).toHaveURL(new RegExp(`${TABLES}$`));
    await expect(page.locator('coaster-loading').first()).toBeVisible();
    await expect(page.getByText('Terraza 1')).toHaveCount(0);

    release();

    await expect(page.getByText('Terraza 1')).toBeVisible();
    await expect(page.locator('coaster-loading')).toHaveCount(0);
  });
});

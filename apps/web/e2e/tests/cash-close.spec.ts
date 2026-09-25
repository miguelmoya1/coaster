import { EstablishmentRole } from '@coaster/common';
import { expect, Page, test } from '@playwright/test';
import { mockApiResponse, mockMyMemberRole } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

const ESTABLISHMENT_ID = 'establishment-123';
const CASH_CLOSE = `/establishments/${ESTABLISHMENT_ID}/orders/cash-close`;
const TABLES = `/establishments/${ESTABLISHMENT_ID}/orders/tables`;

const establishment = { id: ESTABLISHMENT_ID, name: 'The Bar', active: true };

const preview = {
  closedOrders: 38,
  cancelledOrders: 2,
  cancelledAmount: 2300,
  cashAmount: 42050,
  cardAmount: 31000,
  tipAmount: 1200,
  since: '2026-09-23T08:00:00.000Z',
  openOrders: 1,
  openOrdersCharged: 550,
  openingFloat: 15000,
};

const lastClose = {
  id: 'close-1',
  establishmentId: ESTABLISHMENT_ID,
  closedById: 'test-user-123',
  closedByName: 'Test User',
  since: null,
  closedAt: '2026-09-23T08:00:00.000Z',
  closedOrders: 41,
  cancelledOrders: 0,
  cancelledAmount: 0,
  cashAmount: 39800,
  cardAmount: 28000,
  tipAmount: 900,
  openingFloat: 15000,
  countedCash: 54300,
  expectedCash: 54800,
  difference: -500,
  notes: 'Faltan 5 € del cambio de la mesa 4',
};

const openAs = async (page: Page, role: EstablishmentRole, route: string) => {
  await loginAsTestUser(page, route, async (mocked) => {
    await mockMyMemberRole(mocked, role);
    await mockApiResponse(mocked, '/establishments', 'GET', [establishment]);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}`, 'GET', establishment);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/cash-closes/preview`, 'GET', preview);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/cash-closes`, 'GET', [lastClose]);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/cash-closes`, 'POST', lastClose, 201);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/tables`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/orders`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/products`, 'GET', []);
    await mockApiResponse(mocked, `/establishments/${ESTABLISHMENT_ID}/categories`, 'GET', []);
  });
};

test.describe('Cash close', () => {
  test('should let a manager count the drawer and close the till', async ({ page }) => {
    await openAs(page, EstablishmentRole.MANAGER, CASH_CLOSE);

    await expect(page.getByText('Arqueo')).toBeVisible();
    await expect(page.getByText('Comandas abiertas: 1')).toBeVisible();
    await expect(page.getByText('Faltan 5 € del cambio de la mesa 4')).toBeVisible();

    const counted = page.locator('input[type="number"]').nth(1);
    await counted.fill('565.50');

    await expect(page.getByText('Esperado en caja')).toBeVisible();
    await expect(page.getByText('Falta', { exact: false }).first()).toBeVisible();

    const closing = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/cash-closes'),
    );
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar caja' }).click();

    expect((await closing).postDataJSON()).toEqual({ openingFloat: 15000, countedCash: 56550 });
    await expect(page.getByText('Caja cerrada')).toBeVisible();
  });

  test('should keep the till tab away from staff', async ({ page }) => {
    await openAs(page, EstablishmentRole.STAFF, TABLES);

    await expect(page.getByRole('link', { name: 'Historial de Pedidos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Caja' })).toHaveCount(0);
  });
});

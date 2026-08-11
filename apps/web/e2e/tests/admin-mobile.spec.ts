import { expect, test } from '@playwright/test';
import { mockApiResponse } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

/*
 * A phone-width viewport has no horizontal scrollbar to hint that something ran off the side, so a
 * table or a figure that overflows simply becomes text nobody can read. Every admin screen has to
 * fit the viewport it is given.
 */
const PHONE = { width: 375, height: 812 };

const establishment = {
  id: 'est-1',
  name: 'Cervecería La Esquina de Chamberí',
  createdAt: new Date().toISOString(),
  memberCount: 4,
  ownerName: 'Nombre Apellido Apellido',
  ownerEmail: 'nombre.apellido.apellido@example.com',
  plan: 'PRO',
  status: 'ACTIVE',
  billingSource: 'STRIPE',
  accessEndsAt: new Date().toISOString(),
  hasAccess: true,
};

test.use({ viewport: PHONE });

test.describe('Admin on a phone', () => {
  const routes = ['/admin/overview', '/admin/establishments', '/admin/users'];

  test.beforeEach(async ({ page }) => {
    // Deliberately awkward values: the longest realistic email and a seven-figure total.
    await mockApiResponse(page, '/admin/overview', 'GET', {
      establishments: { total: 128, createdLast7Days: 12, createdLast30Days: 40 },
      users: { total: 4096, active: 4000, admins: 3, createdLast30Days: 96 },
      subscriptions: { withAccess: 88, stripe: 70, manual: 18, byStatus: {}, byPlan: {} },
      activity: { ordersLast30Days: 98765, revenueLast30Days: 12345678 },
    });
    await mockApiResponse(page, '/admin/establishments', 'GET', {
      items: [establishment],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    await mockApiResponse(page, '/admin/users', 'GET', {
      items: [
        {
          id: 'u-1',
          name: 'Nombre Apellido Apellido',
          email: 'nombre.apellido.apellido@example.com',
          photoUrl: null,
          role: 'ADMIN',
          active: true,
          language: 'es',
          createdAt: new Date().toISOString(),
          establishmentCount: 3,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  for (const route of routes) {
    test(`should fit the viewport on ${route}`, async ({ page }) => {
      await loginAsTestUser(page, route);

      const { scrollWidth, viewport } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));

      expect(scrollWidth, `${route} runs ${scrollWidth - viewport}px off the side`).toBeLessThanOrEqual(viewport);
    });
  }
});

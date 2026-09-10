import { EstablishmentRole, Role, SubscriptionPlan, SubscriptionStatus } from '@coaster/common';
import { Page, Route } from '@playwright/test';

// Base API url to mock
const API_BASE = 'http://localhost:3000/api/v1';

// The session calls travel with credentials, and a browser refuses those against a wildcard origin.
// Answering with the caller's own origin is what the API does, so the mocks have to do it too.
const corsHeaders = (route: Route) => ({
  'Access-Control-Allow-Origin': route.request().headers()['origin'] ?? 'http://localhost:4200',
  'Access-Control-Allow-Credentials': 'true',
});

/**
 * Setup global API mocks for the application.
 */
export async function setupMockApi(page: Page) {
  // Global OPTIONS handler for CORS
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else {
      await route.fallback();
    }
  });

  // The app asks for a session before the first guarded navigation; this is what stands in for it.
  await mockApiResponse(page, '/auth/refresh', 'POST', {
    accessToken: 'fake-access-token',
    expiresIn: 900,
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: Role.ADMIN,
      active: true,
      language: 'es',
    },
  });

  // Mock backend profile
  await mockApiResponse(page, '/users/me', 'GET', {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: Role.ADMIN,
    active: true,
    language: 'es',
  });

  // Default global mocks for layout
  await mockApiResponse(page, '/establishments', 'GET', []);

  // The workspace asks for its modules before it will render; without this the guards never resolve.
  await page.route('**/api/v1/establishments/*/settings', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({
          establishmentId: route.request().url().split('/establishments/')[1].split('/')[0],
          modules: ['TIME_TRACKING', 'ORDERS', 'INVENTORY'],
        }),
      });
    } else {
      await route.fallback();
    }
  });

  // Wildcard mock for any establishment member me request, to prevent 401s during layout loading
  await page.route('**/api/v1/establishments/*/members/me', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({
          id: 'member-123',
          userId: 'test-user-123',
          establishmentId: 'establishment-123',
          role: EstablishmentRole.OWNER,
          permissions: ['VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'VIEW_SHIFTS', 'VIEW_MEMBERS', 'VIEW_ORDERS'],
          active: true,
          userName: 'Test User',
          userImage: '',
          userEmail: 'test@example.com',
        }),
      });
    } else {
      await route.fallback();
    }
  });
  // Wildcard mock for any establishment members request
  await page.route('**/api/v1/establishments/*/members', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify([]),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/api/v1/establishments/*/establishment-subscription', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      const now = Date.now();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({
          id: 'sub-123',
          establishmentId: 'establishment-123',
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: 'cus_test',
          stripeSubscriptionId: 'sub_test',
          currentPeriodStart: new Date(now - 86_400_000).toISOString(),
          currentPeriodEnd: new Date(now + 30 * 86_400_000).toISOString(),
          trialEndsAt: null,
          canceledAt: null,
          createdAt: new Date(now - 86_400_000).toISOString(),
          updatedAt: new Date(now).toISOString(),
        }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.route('**/api/v1/establishments/*/establishment-subscription/seats', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders(route),
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders(route),
        body: JSON.stringify({ used: 3, billed: 3, included: 10, basePriceCents: 1999, extraPriceCents: 200 }),
      });
    } else {
      await route.fallback();
    }
  });
}

/**
 * Overrides the membership `setupMockApi` installs, which is always an owner. Playwright matches
 * routes newest first, so this has to be registered after `setupMockApi` and before the page loads.
 */
export async function mockMyMemberRole(page: Page, role: EstablishmentRole) {
  await page.route('**/api/v1/establishments/*/members/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders(route),
      body: JSON.stringify({
        id: 'member-123',
        userId: 'test-user-123',
        establishmentId: 'establishment-123',
        role,
        active: true,
        userName: 'Test User',
        userImage: '',
        userEmail: 'test@example.com',
      }),
    });
  });
}

export async function mockApiResponse(page: Page, path: string, method: string, response: unknown, status = 200) {
  const endpoint = `${API_BASE}${path}`;
  await page.route(
    (url) => {
      const urlString = url.toString();
      return urlString === endpoint || urlString.startsWith(endpoint + '?');
    },
    async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...corsHeaders(route),
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else if (route.request().method() === method) {
        // @ts-expect-error process is not defined in this context
        if (process.env['DEBUG_E2E_MOCKS']) console.log(`Mocking ${method} ${endpoint}`);
        await route.fulfill({
          status,
          contentType: 'application/json',
          headers: corsHeaders(route),
          body: JSON.stringify(response),
        });
      } else {
        await route.fallback();
      }
    },
  );
}

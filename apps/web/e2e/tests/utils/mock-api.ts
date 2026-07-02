import { Page } from '@playwright/test';

// Base API url to mock
const API_BASE = 'http://localhost:3000/api/v1';

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
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Firebase-Locale',
        },
      });
    } else {
      await route.fallback();
    }
  });

  // Mock Firebase Auth Emulator initialization and token endpoints
  const authEmulatorBase = '**/identitytoolkit.googleapis.com/v1';
  
  await page.route(`${authEmulatorBase}/accounts:signInWithCustomToken?key=*`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version, X-Firebase-Locale',
        },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        idToken: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
        expiresIn: '3600',
        localId: 'test-user-123',
        isNewUser: false,
      }),
    });
  });

  await page.route('**/securetoken.googleapis.com/v1/token?key=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-jwt-token',
        expires_in: '3600',
        token_type: 'Bearer',
        refresh_token: 'fake-refresh-token',
        id_token: 'fake-jwt-token',
        user_id: 'test-user-123',
        project_id: 'coaster-437f2',
      }),
    });
  });

  await page.route(`${authEmulatorBase}/accounts:lookup?key=*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            localId: 'test-user-123',
            email: 'test@example.com',
            emailVerified: true,
            displayName: 'Test User',
            providerUserInfo: [{ providerId: 'google.com', displayName: 'Test User', email: 'test@example.com' }],
            photoUrl: '',
            lastLoginAt: Date.now().toString(),
            createdAt: Date.now().toString(),
          }
        ]
      })
    });
  });

  // Mock backend profile
  await mockApiResponse(page, '/users/me', 'GET', {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    active: true,
    language: 'es'
  });

  // Default global mocks for layout
  await mockApiResponse(page, '/bars', 'GET', []);

  // Wildcard mock for any bar member me request, to prevent 401s during layout loading
  await page.route('**/api/v1/bars/*/members/me', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          id: 'member-123',
          userId: 'test-user-123',
          barId: 'bar-123',
          role: 'OWNER',
          permissions: ['VIEW_DASHBOARD', 'VIEW_PRODUCTS', 'VIEW_SHIFTS', 'VIEW_MEMBERS', 'VIEW_ORDERS'],
          active: true,
          userName: 'Test User',
          userImage: '',
          userEmail: 'test@example.com'
        }),
      });
    } else {
      await route.fallback();
    }
  });
  // Wildcard mock for any bar members request
  await page.route('**/api/v1/bars/*/members', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([]) });
    } else {
      await route.fallback();
    }
  });
}

export async function mockApiResponse(page: Page, path: string, method: string, response: any, status = 200) {
  const endpoint = `${API_BASE}${path}`;
  await page.route((url) => {
    const urlString = url.toString();
    return urlString === endpoint || urlString.startsWith(endpoint + '?');
  }, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } else if (route.request().method() === method) {
      console.log(`Mocking ${method} ${endpoint}`);
      await route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      });
    } else {
      await route.fallback();
    }
  });
}

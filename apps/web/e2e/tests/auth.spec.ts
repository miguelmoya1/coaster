import { expect, test } from '@playwright/test';
import { LoginPage } from '../pom/login.page';
import { mockApiResponse, setupMockApi } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

test.describe('Auth Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    loginPage = new LoginPage(page);
  });

  test('should display the login card with an email and a password field', async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));

    await loginPage.goto();

    await expect(loginPage.loginCard).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should sign in with an email and a password and land on the establishment picker', async ({ page }) => {
    await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));
    await mockApiResponse(page, '/establishments', 'GET', []);
    await mockApiResponse(page, '/auth/login', 'POST', {
      accessToken: 'fake-access-token',
      expiresIn: 900,
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        active: true,
        language: 'es',
      },
    });

    await loginPage.goto();
    await loginPage.signIn('test@example.com', 'a-good-enough-password');

    await page.waitForURL('**/establishments/select');
    expect(page.url()).toContain('/establishments/select');
  });

  test('should carry an existing session straight through to the establishment picker', async ({ page }) => {
    await mockApiResponse(page, '/establishments', 'GET', []);

    await loginAsTestUser(page, '/establishments/select');

    expect(page.url()).toContain('/establishments/select');
  });
});

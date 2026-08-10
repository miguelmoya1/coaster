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

  test('should display the login card and sign in button', async () => {
    await loginPage.goto();
    await expect(loginPage.loginCard).toBeVisible();
    await expect(loginPage.googleSignInButton).toBeVisible();
    await expect(loginPage.googleSignInButton).toBeEnabled();
  });

  test('should login using mocked auth and redirect to /establishments/select', async ({ page }) => {
    // Mock /establishments so that the redirect works
    await mockApiResponse(page, '/establishments', 'GET', []);

    // Perform login
    await loginAsTestUser(page);

    // After login, the user should be redirected to /establishments/select
    await page.waitForURL('**/establishments/select');
    expect(page.url()).toContain('/establishments/select');
  });
});

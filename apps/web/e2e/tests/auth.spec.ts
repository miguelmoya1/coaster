import { expect, test } from '@playwright/test';
import { LoginPage } from '../pom/login.page';
import { setupMockApi, mockApiResponse } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

test.describe('Auth Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    loginPage = new LoginPage(page);
  });

  test('should display the login card and sign in button', async ({ page }) => {
    await loginPage.goto();
    console.log(await page.content());
    await expect(loginPage.loginCard).toBeVisible();
    await expect(loginPage.googleSignInButton).toBeVisible();
    await expect(loginPage.googleSignInButton).toBeEnabled();
  });

  test('should login using mocked auth and redirect to /bars/select', async ({ page }) => {
    // Mock /bars so that the redirect works
    await mockApiResponse(page, '/bars', 'GET', []);

    // Perform login
    await loginAsTestUser(page);

    // After login, the user should be redirected to /bars/select
    await page.waitForURL('**/bars/select');
    expect(page.url()).toContain('/bars/select');
  });
});

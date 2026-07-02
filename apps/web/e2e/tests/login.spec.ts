import { test, expect } from '@playwright/test';
import { LoginPage } from '../pom/login.page';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display the login card and sign in button', async ({ page }) => {
    // Assert the card is visible
    await expect(loginPage.loginCard).toBeVisible();
    
    // Assert the button is visible and enabled
    await expect(loginPage.googleSignInButton).toBeVisible();
    await expect(loginPage.googleSignInButton).toBeEnabled();
  });
});

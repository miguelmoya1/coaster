import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly loginCard: Locator;
  readonly googleSignInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginCard = page.getByTestId('login-card');
    this.googleSignInButton = page.getByTestId('google-signin-btn');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async clickGoogleSignIn() {
    await this.googleSignInButton.click();
  }
}

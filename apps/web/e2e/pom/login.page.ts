import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly loginCard: Locator;
  readonly googleSignInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginCard = page.locator('mat-card');
    // Finds the button within the login page. We can search by role and text or just button.
    this.googleSignInButton = page.getByRole('button');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async clickGoogleSignIn() {
    await this.googleSignInButton.click();
  }
}

import { Locator, Page } from '@playwright/test';

export class InvitePage {
  readonly page: Page;
  readonly card: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alreadyHasAccount: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.card = page.getByTestId('invite-card');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('invite-btn');
    this.alreadyHasAccount = page.getByTestId('invite-already');
    this.failed = page.getByTestId('invite-failed');
  }

  async goto(token: string) {
    await this.page.goto(`/invite/${token}`);
  }

  async claim(password: string) {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

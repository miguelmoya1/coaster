import { Locator, Page } from '@playwright/test';

export class BarsPage {
  readonly page: Page;
  readonly createBarButton: Locator;
  readonly newBarNameInput: Locator;
  readonly confirmCreateButton: Locator;
  readonly barListCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createBarButton = page.getByTestId('create-bar-btn');
    this.newBarNameInput = page.getByTestId('bar-name-input');
    this.confirmCreateButton = page.getByTestId('submit-btn');
    this.barListCards = page.getByTestId('bar-card');
  }

  async goto() {
    await this.page.goto('/bars');
  }

  async createBar(name: string) {
    await this.createBarButton.click();
    await this.newBarNameInput.fill(name);
    await this.confirmCreateButton.click();
  }

  async selectBar(name: string) {
    // Select the bar card that contains the text
    await this.page.getByTestId('bar-card').filter({ hasText: name }).click();
  }
}

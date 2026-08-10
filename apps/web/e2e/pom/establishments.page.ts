import { Locator, Page } from '@playwright/test';

export class EstablishmentsPage {
  readonly page: Page;
  readonly createEstablishmentButton: Locator;
  readonly newEstablishmentNameInput: Locator;
  readonly confirmCreateButton: Locator;
  readonly establishmentListCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createEstablishmentButton = page.getByTestId('create-establishment-btn');
    this.newEstablishmentNameInput = page.getByTestId('establishment-name-input');
    this.confirmCreateButton = page.getByTestId('submit-btn');
    this.establishmentListCards = page.getByTestId('establishment-card');
  }

  async goto() {
    await this.page.goto('/establishments');
  }

  async createEstablishment(name: string) {
    await this.createEstablishmentButton.click();
    await this.newEstablishmentNameInput.fill(name);
    await this.confirmCreateButton.click();
  }

  async selectEstablishment(name: string) {
    // Select the establishment card that contains the text
    await this.page.getByTestId('establishment-card').filter({ hasText: name }).click();
  }
}

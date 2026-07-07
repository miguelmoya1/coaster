import { Locator, Page } from '@playwright/test';

export class PosPage {
  readonly page: Page;
  readonly tableCards: Locator;
  readonly orderItemsContainer: Locator;
  readonly confirmOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tableCards = page.getByTestId('table-card');
    this.orderItemsContainer = page.getByTestId('pos-products-list');
    this.confirmOrderButton = page.getByTestId('submit-order-btn');
  }

  async goto(barId: string) {
    await this.page.goto(`/bars/${barId}/orders/tables`);
  }

  async selectFirstAvailableTable() {
    await this.page.getByTestId('table-card').filter({ hasText: /libre|available/i }).first().click();
  }

  async openTable(tableName: string) {
    // Select the table card that contains the text
    await this.page.getByTestId('table-card-name').filter({ hasText: tableName }).first().click({ force: true });
  }

  async addProductToOrder(productName: string) {
    await this.page.getByTestId('pos-product-card').filter({ hasText: productName }).first().click();
  }

  async confirmOrder() {
    await this.confirmOrderButton.click();
  }
}

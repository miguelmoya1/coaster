import { Locator, Page } from '@playwright/test';

export class MenuPage {
  readonly page: Page;
  readonly fabButton: Locator;
  readonly categoryTab: Locator;
  readonly productTab: Locator;

  readonly categoryNameInput: Locator;
  readonly confirmCategoryButton: Locator;

  readonly productNameInput: Locator;
  readonly productPriceInput: Locator;
  readonly confirmProductButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fabButton = page.getByTestId('create-pantry-fab');
    this.categoryTab = page.getByTestId('tab-CATEGORY');
    this.productTab = page.getByTestId('tab-PRODUCT');

    this.categoryNameInput = page.getByTestId('category-name-input');
    this.confirmCategoryButton = page.getByTestId('submit-btn');

    this.productNameInput = page.getByTestId('product-name-input');
    this.productPriceInput = page.getByTestId('product-price-input');
    this.confirmProductButton = page.getByTestId('submit-btn');
  }

  async goto(barId: string) {
    await this.page.goto(`/bars/${barId}/pantry`);
  }

  async createCategory(name: string) {
    await this.fabButton.click({ force: true });
    await this.categoryTab.click({ force: true });
    await this.categoryNameInput.fill(name);
    await this.confirmCategoryButton.click({ force: true });
  }

  async createProduct(name: string, price: string) {
    await this.fabButton.click({ force: true });
    await this.productTab.click({ force: true });
    await this.productNameInput.fill(name);
    await this.productPriceInput.fill(price);
    await this.confirmProductButton.click({ force: true });
  }
}

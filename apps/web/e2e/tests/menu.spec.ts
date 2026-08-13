import { EstablishmentRole } from '@coaster/common';
import { expect, test } from '@playwright/test';
import { MenuPage } from '../pom/menu.page';
import { mockApiResponse } from './utils/mock-api';
import { loginAsTestUser } from './utils/mock-auth';

test.describe('Menu Management', () => {
  let menuPage: MenuPage;
  const establishmentId = 'establishment-123';

  test.beforeEach(async ({ page }) => {
    menuPage = new MenuPage(page);
  });

  test('should create a new category', async ({ page }) => {
    // Mock the establishment profile
    await mockApiResponse(page, `/establishments/${establishmentId}`, 'GET', {
      id: establishmentId,
      name: 'My Establishment',
      active: true,
    });
    await mockApiResponse(page, `/establishments/${establishmentId}/members/me`, 'GET', {
      id: 'member-123',
      userId: 'test-user-123',
      establishmentId,
      role: EstablishmentRole.OWNER,
      permissions: [],
      active: true,
      userName: 'Test User',
      userImage: '',
      userEmail: 'test@example.com',
    });
    // Initial categories and products mock
    await mockApiResponse(page, `/establishments/${establishmentId}/categories`, 'GET', []);
    await mockApiResponse(page, `/establishments/${establishmentId}/products`, 'GET', []);

    // Mock POST
    const newCat = { id: 'cat-1', name: 'Drinks', order: 1, active: true };
    await mockApiResponse(page, `/establishments/${establishmentId}/categories`, 'POST', newCat, 201);

    await loginAsTestUser(page, `/establishments/${establishmentId}/inventory`);

    await menuPage.fabButton.click();
    await menuPage.categoryTab.click();
    await menuPage.categoryNameInput.fill('Drinks');

    // Update GET after create
    await mockApiResponse(page, `/establishments/${establishmentId}/categories`, 'GET', [newCat]);

    await menuPage.confirmCategoryButton.click();

    // Verify it appeared in the UI
    await expect(page.getByTestId('category-name').filter({ hasText: 'Drinks' }).first()).toBeVisible();
  });

  test('should create a new product', async ({ page }) => {
    // Mock the establishment profile
    await mockApiResponse(page, `/establishments/${establishmentId}`, 'GET', {
      id: establishmentId,
      name: 'My Establishment',
      active: true,
    });
    await mockApiResponse(page, `/establishments/${establishmentId}/members/me`, 'GET', {
      id: 'member-123',
      userId: 'test-user-123',
      establishmentId,
      role: EstablishmentRole.OWNER,
      permissions: [],
      active: true,
      userName: 'Test User',
      userImage: '',
      userEmail: 'test@example.com',
    });
    // Mock existing categories so we can assign product
    const cat = { id: 'cat-1', name: 'Drinks', order: 1, active: true };
    await mockApiResponse(page, `/establishments/${establishmentId}/categories`, 'GET', [cat]);
    await mockApiResponse(page, `/establishments/${establishmentId}/products`, 'GET', []);

    // Mock POST product
    const newProd = {
      id: 'prod-1',
      name: 'Cola',
      price: 2.5,
      categoryId: 'cat-1',
      currentStock: 0,
      minStockAlert: 5,
      active: true,
    };
    await mockApiResponse(page, `/establishments/${establishmentId}/products`, 'POST', newProd, 201);

    await loginAsTestUser(page, `/establishments/${establishmentId}/inventory`);

    await menuPage.fabButton.click();
    await menuPage.productTab.click();
    await menuPage.productNameInput.fill('Cola');
    await menuPage.productPriceInput.fill('2.50');
    // Select category
    await page.locator('mat-select').click();
    await page.locator('mat-option').first().click();

    // Update GET after create
    await mockApiResponse(page, `/establishments/${establishmentId}/products`, 'GET', [newProd]);

    await menuPage.confirmProductButton.click();

    // Verify it appeared
    await expect(page.getByTestId('inventory-item-name').filter({ hasText: 'Cola' }).first()).toBeVisible();
  });
});

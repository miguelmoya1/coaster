import { test, expect } from '@playwright/test';
import { MenuPage } from '../pom/menu.page';
import { loginAsTestUser } from './utils/mock-auth';
import { mockApiResponse } from './utils/mock-api';

test.describe('Menu Management', () => {
  let menuPage: MenuPage;
  const barId = 'bar-123';

  test.beforeEach(async ({ page }) => {
    menuPage = new MenuPage(page);
  });

  test('should create a new category', async ({ page }) => {
    // Mock the bar profile
    await mockApiResponse(page, `/bars/${barId}`, 'GET', { id: barId, name: 'My Bar', active: true });
    await mockApiResponse(page, `/bars/${barId}/members/me`, 'GET', {
      id: 'member-123', userId: 'test-user-123', barId, role: 'OWNER', permissions: [], active: true, userName: 'Test User', userImage: '', userEmail: 'test@example.com'
    });
    // Initial categories mock
    await mockApiResponse(page, `/bars/${barId}/categories`, 'GET', []);
    
    // Mock POST
    const newCat = { id: 'cat-1', name: 'Drinks', order: 1, active: true };
    await mockApiResponse(page, `/bars/${barId}/categories`, 'POST', newCat, 201);
    
    // Override GET after create
    await page.route(`**/api/v1/bars/${barId}/categories`, async (route) => {
      if (route.request().method() === 'GET') {
         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([newCat]) });
      } else {
         await route.fallback();
      }
    });

    await loginAsTestUser(page, `/bars/${barId}/pantry`);
    
    await menuPage.createCategory('Drinks');
    
    // Verify it appeared in the UI
    await expect(page.getByTestId('category-name').filter({ hasText: 'Drinks' }).first()).toBeVisible();
  });

  test('should create a new product', async ({ page }) => {
    // Mock the bar profile
    await mockApiResponse(page, `/bars/${barId}`, 'GET', { id: barId, name: 'My Bar', active: true });
    await mockApiResponse(page, `/bars/${barId}/members/me`, 'GET', {
      id: 'member-123', userId: 'test-user-123', barId, role: 'OWNER', permissions: [], active: true, userName: 'Test User', userImage: '', userEmail: 'test@example.com'
    });
    // Mock existing categories so we can assign product
    const cat = { id: 'cat-1', name: 'Drinks', order: 1, active: true };
    await mockApiResponse(page, `/bars/${barId}/categories`, 'GET', [cat]);
    await mockApiResponse(page, `/bars/${barId}/products`, 'GET', []);
    
    // Mock POST product
    const newProd = { id: 'prod-1', name: 'Cola', price: 2.50, categoryId: 'cat-1', active: true };
    await mockApiResponse(page, `/bars/${barId}/products`, 'POST', newProd, 201);
    
    await page.route(`**/api/v1/bars/${barId}/products`, async (route) => {
      if (route.request().method() === 'GET') {
         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([newProd]) });
      } else {
         await route.fallback();
      }
    });

    await loginAsTestUser(page, `/bars/${barId}/pantry`);
    
    await menuPage.createProduct('Cola', '2.50');
    
    // Verify it appeared
    await expect(page.getByTestId('pantry-item-name').filter({ hasText: 'Cola' }).first()).toBeVisible();
  });
});

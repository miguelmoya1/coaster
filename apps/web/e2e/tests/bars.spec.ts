import { test, expect } from '@playwright/test';
import { BarsPage } from '../pom/bars.page';
import { loginAsTestUser } from './utils/mock-auth';
import { mockApiResponse } from './utils/mock-api';

test.describe('Bars Management', () => {
  let barsPage: BarsPage;

  test.beforeEach(async ({ page }) => {
    barsPage = new BarsPage(page);
  });

  test('should display empty state if user has no bars', async ({ page }) => {
    // Mock 0 bars
    await mockApiResponse(page, '/bars', 'GET', []);
    
    await loginAsTestUser(page, '/bars');
    
    await expect(page.getByTestId('empty-bars-message')).toBeVisible();
    await expect(barsPage.createBarButton).toBeVisible();
  });

  test('should create a new bar successfully', async ({ page }) => {
    // 1. Initial state: 0 bars
    await mockApiResponse(page, '/bars', 'GET', []);
    
    // 2. Mock the POST request for creating a bar
    const newBar = { id: 'new-bar-123', name: 'My E2E Bar', active: true };
    await mockApiResponse(page, '/bars', 'POST', newBar, 201);

    await loginAsTestUser(page, '/bars');
    
    // Click create and fill form
    await barsPage.createBarButton.click();
    await barsPage.newBarNameInput.fill('My E2E Bar');
    
    // Mock the GET request to return the newly created bar before submitting
    await mockApiResponse(page, '/bars', 'GET', [newBar]);
    
    await barsPage.confirmCreateButton.click();
    
    // Check it redirects to /bars/new-bar-123 or displays it in the list
    // Wait for the UI to update
    await expect(page.getByTestId('bar-card-name').filter({ hasText: 'My E2E Bar' }).first()).toBeVisible({ timeout: 10000 });
  });
});

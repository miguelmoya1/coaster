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
    
    // 3. Mock the new list containing the new bar
    let getCalls = 0;
    await page.route('**/api/v1/bars', async (route) => {
      if (route.request().method() === 'GET') {
         getCalls++;
         if (getCalls === 1) {
           await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([]) });
         } else {
           await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify([newBar]) });
         }
      } else if (route.request().method() === 'POST') {
         await route.fulfill({ status: 201, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(newBar) });
      } else if (route.request().method() === 'OPTIONS') {
         await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
      } else {
         await route.fallback();
      }
    });

    await loginAsTestUser(page, '/bars');
    
    // Click create and fill form
    await barsPage.createBar('My E2E Bar');
    
    // Check it redirects to /bars/new-bar-123 or displays it in the list
    // Wait for the UI to update
    await expect(page.getByTestId('bar-card-name').filter({ hasText: 'My E2E Bar' }).first()).toBeVisible({ timeout: 10000 });
  });
});

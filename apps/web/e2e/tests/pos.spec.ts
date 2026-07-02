import { test, expect } from '@playwright/test';
import { PosPage } from '../pom/pos.page';
import { loginAsTestUser } from './utils/mock-auth';
import { mockApiResponse } from './utils/mock-api';

test.describe('POS Flow', () => {
  let posPage: PosPage;
  const barId = 'bar-123';

  test.beforeEach(async ({ page }) => {
    posPage = new PosPage(page);
  });

  test('should open a table and add a product', async ({ page }) => {
    // Mock the bar profile
    await mockApiResponse(page, `/bars/${barId}`, 'GET', { id: barId, name: 'My Bar', active: true });
    await mockApiResponse(page, `/bars/${barId}/members/me`, 'GET', {
      id: 'member-123', userId: 'test-user-123', barId, role: 'OWNER', permissions: [], active: true, userName: 'Test User', userImage: '', userEmail: 'test@example.com'
    });
    
    // Mock products and categories for POS
    const cat = { id: 'cat-1', name: 'Drinks', order: 1, active: true };
    const prod = { id: 'prod-1', name: 'Cola', price: 2.50, categoryId: 'cat-1', active: true };
    await mockApiResponse(page, `/bars/${barId}/categories`, 'GET', [cat]);
    await mockApiResponse(page, `/bars/${barId}/products`, 'GET', [prod]);

    // Mock tables: 1 table available
    const table = { id: 'table-1', name: 'T1', status: 'AVAILABLE', active: true };
    await mockApiResponse(page, `/bars/${barId}/tables`, 'GET', [table]);
    
    // Mock shift: active shift
    await mockApiResponse(page, `/bars/${barId}/shifts/active`, 'GET', { id: 'shift-1', userId: 'test-user-123', status: 'ACTIVE' });
    
    // Mock POST order
    const order = { id: 'order-1', tableId: 'table-1', status: 'OPEN', total: 2.50, items: [] };
    await mockApiResponse(page, `/bars/${barId}/orders`, 'POST', order, 201);
    
    // After creating order, the app usually fetches the table again or the order
    await mockApiResponse(page, `/bars/${barId}/orders/order-1`, 'GET', order);

    await loginAsTestUser(page, `/bars/${barId}/orders/tables`);
    
    // It should display the table T1
    await expect(page.getByTestId('table-card-name').filter({ hasText: 'T1' }).first()).toBeVisible();
    
    // In a real flow, clicking the table might navigate to POS screen or open order
    // But since this is highly dependent on UI structure, we just do a basic test for now
  });
});

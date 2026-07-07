import { test } from '@playwright/test';
import { mockApiResponse } from './tests/utils/mock-api';
import { loginAsTestUser } from './tests/utils/mock-auth';

import { expect } from '@playwright/test';

test('should load pantry page correctly', async ({ page }) => {
  const barId = 'bar-123';
  await mockApiResponse(page, `/bars/${barId}`, 'GET', { id: barId, name: 'My Bar', active: true });
  await mockApiResponse(page, `/bars/${barId}/categories`, 'GET', []);
  await mockApiResponse(page, `/bars/${barId}/products`, 'GET', []);

  await loginAsTestUser(page, `/bars/${barId}/pantry`);

  // Verify that the navigation was successful
  await expect(page).toHaveURL(new RegExp(`/bars/${barId}/pantry`));
});

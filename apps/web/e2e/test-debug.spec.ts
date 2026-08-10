import { test } from '@playwright/test';
import { mockApiResponse } from './tests/utils/mock-api';
import { loginAsTestUser } from './tests/utils/mock-auth';

import { expect } from '@playwright/test';

test('should load pantry page correctly', async ({ page }) => {
  const establishmentId = 'establishment-123';
  await mockApiResponse(page, `/establishments/${establishmentId}`, 'GET', {
    id: establishmentId,
    name: 'My Establishment',
    active: true,
  });
  await mockApiResponse(page, `/establishments/${establishmentId}/categories`, 'GET', []);
  await mockApiResponse(page, `/establishments/${establishmentId}/products`, 'GET', []);

  await loginAsTestUser(page, `/establishments/${establishmentId}/pantry`);

  // Verify that the navigation was successful
  await expect(page).toHaveURL(new RegExp(`/establishments/${establishmentId}/pantry`));
});

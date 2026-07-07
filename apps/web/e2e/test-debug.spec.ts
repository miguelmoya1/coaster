import { test } from '@playwright/test';
import { mockApiResponse } from './tests/utils/mock-api';
import { loginAsTestUser } from './tests/utils/mock-auth';

test.skip('debug menu', async ({ page }) => {
  page.on('console', (m) => console.log('BROWSER_CONSOLE:', m.text()));
  page.on('request', (r) => console.log('REQUEST:', r.method(), r.url()));
  page.on('response', (r) => console.log('RESPONSE:', r.status(), r.url()));

  const barId = 'bar-123';
  await mockApiResponse(page, `/bars/${barId}`, 'GET', { id: barId, name: 'My Bar', active: true });
  await mockApiResponse(page, `/bars/${barId}/categories`, 'GET', []);
  await mockApiResponse(page, `/bars/${barId}/products`, 'GET', []);

  await loginAsTestUser(page, `/bars/${barId}/pantry`);

  console.log('CURRENT URL:', page.url());
});

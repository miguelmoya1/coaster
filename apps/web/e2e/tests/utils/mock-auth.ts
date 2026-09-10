import { Page } from '@playwright/test';
import { setupMockApi } from './mock-api';

export async function loginAsTestUser(
  page: Page,
  targetRoute: string = '/establishments',
  beforeLoad?: (page: Page) => Promise<void>,
) {
  // The session comes from the mocked /auth/refresh, so the guard restores it like it would in production
  await setupMockApi(page);

  // Anything the test needs to override has to land after the defaults and before the app loads
  await beforeLoad?.(page);

  await page.goto(targetRoute);

  await page.waitForURL(`**${targetRoute}**`);
}

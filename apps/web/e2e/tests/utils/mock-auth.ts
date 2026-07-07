import { Page } from '@playwright/test';
import { setupMockApi } from './mock-api';

export async function loginAsTestUser(page: Page, targetRoute: string = '/bars') {
  // Setup API mocks first so signInWithCustomToken intercepts work
  await setupMockApi(page);
  


  // Go to the home page or login page to ensure the angular app is loaded
  await page.goto('/login');

  // Wait for the Angular app to initialize the Auth service
  await page.waitForFunction(() => (window as any).__TEST_LOGIN__ !== undefined);

  // Trigger the fake login and let it navigate using Angular Router
  await page.evaluate(async (route) => {
    await (window as any).__TEST_LOGIN__('fake-jwt-token', route);
  }, targetRoute);
  
  // Wait until Angular finishes navigation
  await page.waitForURL(`**${targetRoute}**`);
}

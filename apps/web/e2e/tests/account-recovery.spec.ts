import { expect, test } from '@playwright/test';
import { InvitePage } from '../pom/invite.page';
import { mockApiResponse, setupMockApi } from './utils/mock-api';

const SESSION = {
  accessToken: 'fake-access-token',
  expiresIn: 900,
  user: {
    id: 'test-user-123',
    email: 'invitada@example.com',
    name: 'Invitada',
    role: 'USER',
    active: true,
    language: 'es',
    emailVerified: true,
  },
};

test.describe('Claiming an invitation', () => {
  let invitePage: InvitePage;

  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));
    await mockApiResponse(page, '/establishments', 'GET', []);

    invitePage = new InvitePage(page);
  });

  test('should carry an invited person from the link to the app', async ({ page }) => {
    await mockApiResponse(page, '/auth/invite/una-invitacion', 'GET', {
      email: 'invitada@example.com',
      name: 'Invitada',
      hasCredentials: false,
    });
    await mockApiResponse(page, '/auth/invite', 'POST', SESSION);

    await invitePage.goto('una-invitacion');

    await expect(invitePage.card).toBeVisible();
    await expect(page.getByText('invitada@example.com')).toBeVisible();

    await invitePage.claim('una-contrasena-buena');

    await page.waitForURL('**/establishments/select');
    expect(page.url()).toContain('/establishments/select');
  });

  test('should send somebody who already has an account to sign in as usual', async ({ page }) => {
    await mockApiResponse(page, '/auth/invite/ya-tiene-cuenta', 'GET', {
      email: 'invitada@example.com',
      name: 'Invitada',
      hasCredentials: true,
    });

    await invitePage.goto('ya-tiene-cuenta');

    await expect(invitePage.alreadyHasAccount).toBeVisible();
    await expect(invitePage.passwordInput).toBeHidden();
  });

  test('should say so when the invitation has expired instead of showing an empty form', async ({ page }) => {
    await mockApiResponse(
      page,
      '/auth/invite/caducada',
      'GET',
      { message: 'INVALID_TOKEN', statusCode: 400 },
      400,
    );

    await invitePage.goto('caducada');

    await expect(invitePage.failed).toBeVisible();
    await expect(invitePage.passwordInput).toBeHidden();
  });
});

test.describe('Resetting a forgotten password', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 401, body: '{}' }));
    await mockApiResponse(page, '/establishments', 'GET', []);
  });

  test('should ask for the address and then say nothing about whether it exists', async ({ page }) => {
    await mockApiResponse(page, '/auth/forgot-password', 'POST', {}, 204);

    await page.goto('/forgot-password');
    await page.getByTestId('email-input').fill('alguien@example.com');
    await page.getByTestId('forgot-btn').click();

    await expect(page.getByTestId('forgot-sent')).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeHidden();
  });

  test('should set the new password from the link and land in the app', async ({ page }) => {
    await mockApiResponse(page, '/auth/reset-password', 'POST', SESSION);

    await page.goto('/reset-password/un-token');
    await page.getByTestId('password-input').fill('una-contrasena-buena');
    await page.getByTestId('reset-btn').click();

    await page.waitForURL('**/establishments/select');
    expect(page.url()).toContain('/establishments/select');
  });
});

test.describe('Confirming the address', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockApi(page);
    await mockApiResponse(page, '/establishments', 'GET', []);
  });

  test('should confirm on its own when the link is good', async ({ page }) => {
    await mockApiResponse(page, '/auth/verify-email', 'POST', {}, 204);

    await page.goto('/verify-email/un-token');

    await expect(page.getByTestId('verify-done')).toBeVisible();
  });

  test('should say what happened when the link is spent', async ({ page }) => {
    await mockApiResponse(page, '/auth/verify-email', 'POST', { message: 'INVALID_TOKEN', statusCode: 400 }, 400);

    await page.goto('/verify-email/un-token');

    await expect(page.getByTestId('verify-failed')).toBeVisible();
  });
});

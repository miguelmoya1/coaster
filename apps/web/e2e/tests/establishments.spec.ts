import { test, expect } from '@playwright/test';
import { EstablishmentsPage } from '../pom/establishments.page';
import { loginAsTestUser } from './utils/mock-auth';
import { mockApiResponse } from './utils/mock-api';

test.describe('Establishments Management', () => {
  let establishmentsPage: EstablishmentsPage;

  test.beforeEach(async ({ page }) => {
    establishmentsPage = new EstablishmentsPage(page);
  });

  test('should display empty state if user has no establishments', async ({ page }) => {
    // Mock 0 establishments
    await mockApiResponse(page, '/establishments', 'GET', []);

    await loginAsTestUser(page, '/establishments');

    await expect(page.getByTestId('empty-establishments-message')).toBeVisible();
    await expect(establishmentsPage.createEstablishmentButton).toBeVisible();
  });

  test('should create a new establishment successfully', async ({ page }) => {
    // 1. Initial state: 0 establishments
    await mockApiResponse(page, '/establishments', 'GET', []);

    // 2. Mock the POST request for creating an establishment
    const newEstablishment = { id: 'new-establishment-123', name: 'My E2E Establishment', active: true };
    await mockApiResponse(page, '/establishments', 'POST', newEstablishment, 201);

    await loginAsTestUser(page, '/establishments');

    // Click create and fill form
    await establishmentsPage.createEstablishmentButton.click();
    await establishmentsPage.newEstablishmentNameInput.fill('My E2E Establishment');

    // Mock the GET request to return the newly created establishment before submitting
    await mockApiResponse(page, '/establishments', 'GET', [newEstablishment]);

    await establishmentsPage.confirmCreateButton.click();

    // Check it redirects to /establishments/new-establishment-123 or displays it in the list
    // Wait for the UI to update
    await expect(
      page.getByTestId('establishment-card-name').filter({ hasText: 'My E2E Establishment' }).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

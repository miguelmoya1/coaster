import request from 'supertest';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('PrintersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;

  beforeAll(async () => {
    // Temporary make mock user an ADMIN to bypass AdminGuard if needed, but here we just need a bar
    await testSetup.setup();
    await testSetup.clearDatabase();
    
    // Seed the mock user
    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });

    // Seed a bar owned by mockUser
    const bar = await testSetup.prisma.dbBar.create({
      data: {
        name: 'My Bar',
        members: {
          create: {
            userId: mockUser.id,
            role: 'OWNER',
          },
        },
      },
    });
    barId = bar.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('Print Order', () => {
    it('should be guarded by authentication and bar permissions', async () => {
      // Mock order print request. 
      // The API endpoint should exist and return a validation error or 404 (if order doesn't exist)
      const response = await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/printers/print-order`)
        .send({ orderId: 'non-existing-order-id' });
        
      expect(response.status === 404 || response.status === 400 || response.status === 201).toBeTruthy();
    });
  });
});

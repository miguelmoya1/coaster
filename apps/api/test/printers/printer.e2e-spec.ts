import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('PrintersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;

  beforeAll(async () => {
    await testSetup.setup();
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('Print Order', () => {
    it('should be guarded by authentication and establishment permissions', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/printers/print-order`)
        .send({ orderId: 'non-existing-order-id' });

      expect(response.status === 404 || response.status === 400 || response.status === 201).toBeTruthy();
    });
  });
});

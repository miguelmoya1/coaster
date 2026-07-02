import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('StatsController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
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

  describe('GET /api/bars/:barId/stats', () => {
    it('should return bar stats', async () => {
      // Create some orders to generate stats
      await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: 'CLOSED',
          totalAmount: 100,
          paymentMethod: 'CASH',
        },
      });

      await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: 'CLOSED',
          totalAmount: 50,
          paymentMethod: 'CARD',
        },
      });

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/bars/${barId}/stats`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.todayRevenue).toBeDefined();
      expect(response.body.weeklyRevenue).toBeDefined();
      expect(response.body.currentMonthRevenue).toBeDefined();
      expect(response.body.yearlyRevenue).toBeDefined();
      expect(response.body.monthlyBreakdown).toBeDefined();
    });
  });
});

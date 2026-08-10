import { OrderStatus, PaymentMethod } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('StatsController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
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

    const bar = await testSetup.createBar('My Bar');
    barId = bar.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('revenue after a real checkout', () => {
    const http = () => testSetup.app.getHttpServer();

    const sellOneProduct = async (price: number, discountPercentage?: number, tipAmount?: number) => {
      const category = await testSetup.prisma.dbCategory.create({ data: { name: 'Drinks', barId } });
      const product = await testSetup.prisma.dbProduct.create({
        data: { name: 'Beer', price, categoryId: category.id },
      });

      await request(http())
        .post(`/api/bars/${barId}/orders`)
        .send({ items: [{ productId: product.id, quantity: 1 }] })
        .expect(201);

      const order = await testSetup.prisma.dbOrder.findFirstOrThrow({ where: { barId, status: OrderStatus.OPEN } });

      if (discountPercentage) {
        await request(http())
          .post(`/api/bars/${barId}/orders/${order.id}/adjustments`)
          .send({ target: 'ORDER', type: 'PERCENTAGE', value: discountPercentage })
          .expect(201);
      }

      if (tipAmount) {
        await request(http()).patch(`/api/bars/${barId}/orders/${order.id}/tip`).send({ tipAmount }).expect(200);
      }

      await request(http())
        .post(`/api/bars/${barId}/orders/${order.id}/checkout`)
        .send({ paymentMethod: PaymentMethod.CASH })
        .expect(201);

      const { body } = await request(http()).get(`/api/bars/${barId}/stats`).expect(200);
      return body as { todayRevenue: number };
    };

    it('should report the full price when nothing was discounted', async () => {
      expect((await sellOneProduct(1000)).todayRevenue).toBe(1000);
    });

    it('should report what was charged after a discount, not the menu price', async () => {
      expect((await sellOneProduct(1000, 20)).todayRevenue).toBe(800);
    });

    it('should not count the tip as revenue', async () => {
      expect((await sellOneProduct(1000, undefined, 300)).todayRevenue).toBe(1000);
    });
  });

  describe('GET /api/bars/:barId/stats', () => {
    it('should return bar stats', async () => {
      await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.CLOSED,
          totalAmount: 100,
          paymentMethod: PaymentMethod.CASH,
        },
      });

      await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.CLOSED,
          totalAmount: 50,
          paymentMethod: PaymentMethod.CARD,
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/stats`).expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.todayRevenue).toBeDefined();
      expect(response.body.weeklyRevenue).toBeDefined();
      expect(response.body.currentMonthRevenue).toBeDefined();
      expect(response.body.yearlyRevenue).toBeDefined();
      expect(response.body.monthlyBreakdown).toBeDefined();
    });
  });
});

import { BarRole, OrderStatus, PaymentMethod } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('OrdersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let tableId: string;
  let categoryId: string;
  let product1Id: string;
  let product2Id: string;

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
            role: BarRole.OWNER,
          },
        },
      },
    });
    barId = bar.id;

    // Seed a table
    const table = await testSetup.prisma.dbTable.create({
      data: {
        name: 'Table 1',
        barId,
      },
    });
    tableId = table.id;

    // Seed a category and products
    const category = await testSetup.prisma.dbCategory.create({
      data: {
        name: 'Drinks',
        barId,
      },
    });
    categoryId = category.id;

    const product1 = await testSetup.prisma.dbProduct.create({
      data: {
        name: 'Beer',
        price: 5,
        categoryId,
      },
    });
    product1Id = product1.id;

    const product2 = await testSetup.prisma.dbProduct.create({
      data: {
        name: 'Coke',
        price: 3,
        categoryId,
      },
    });
    product2Id = product2.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/orders', () => {
    it('should create an order with items', async () => {
      const dto = {
        tableId,
        items: [
          { productId: product1Id, quantity: 2 },
          { productId: product2Id, quantity: 1 },
        ],
      };

      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/orders`).send(dto).expect(201);

      // Verify in database
      const orders = await testSetup.prisma.dbOrder.findMany({
        where: { barId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].tableId).toBe(tableId);
      expect(orders[0].status).toBe(OrderStatus.OPEN);
      expect(orders[0].items).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(13); // 2 * 5 + 1 * 3
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders`)
        .send({ items: [] }) // Empty items array is invalid
        .expect(400);
    });
  });

  describe('GET /api/bars/:barId/orders', () => {
    it('should return a list of orders', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          tableId,
          status: OrderStatus.OPEN,
          totalAmount: 5,
          items: {
            create: [
              {
                productId: product1Id,
                quantity: 1,
                priceAtPurchase: 5,
              },
            ],
          },
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/orders`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(order.id);
      expect(response.body[0].totalAmount).toBe(5);
    });
  });

  describe('POST /api/bars/:barId/orders/:orderId/items', () => {
    it('should add items to an existing order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          totalAmount: 0,
        },
      });

      const dto = {
        items: [{ productId: product1Id, quantity: 1 }],
      };

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders/${order.id}/items`)
        .send(dto)
        .expect(201);

      const updated = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      expect(updated?.items).toHaveLength(1);
      expect(updated?.totalAmount).toBe(5);
    });
  });

  describe('POST /api/bars/:barId/orders/:orderId/cancel', () => {
    it('should cancel an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 5,
          items: {
            create: [
              {
                productId: product1Id,
                quantity: 1,
                priceAtPurchase: 5,
              },
            ],
          },
        },
      });

      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/orders/${order.id}/cancel`).expect(201);

      const updated = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(updated?.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('POST /api/bars/:barId/orders/:orderId/checkout', () => {
    it('should checkout an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 5,
          items: {
            create: [
              {
                productId: product1Id,
                quantity: 1,
                priceAtPurchase: 5,
                servedQuantity: 1,
              },
            ],
          },
        },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders/${order.id}/checkout`)
        .send({ paymentMethod: PaymentMethod.CASH })
        .expect(201);

      const updated = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(updated?.status).toBe(OrderStatus.CLOSED);
      expect(updated?.paymentMethod).toBe(PaymentMethod.CASH);
    });
  });

  describe('DELETE /api/bars/:barId/orders/:orderId', () => {
    it('should delete an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.CLOSED,
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/orders/${order.id}`).expect(200);

      const deleted = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

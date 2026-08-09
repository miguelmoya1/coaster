import { OrderStatus, PaymentMethod } from '@coaster/common';
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

    const table = await testSetup.prisma.dbTable.create({
      data: {
        name: 'Table 1',
        barId,
      },
    });
    tableId = table.id;

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

      const orders = await testSetup.prisma.dbOrder.findMany({
        where: { barId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].tableId).toBe(tableId);
      expect(orders[0].status).toBe(OrderStatus.OPEN);
      expect(orders[0].items).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(13);
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/orders`).send({ items: [] }).expect(400);
    });

    it('should refuse a product that belongs to another bar, leaving its stock alone', async () => {
      const otherBar = await testSetup.createBar('Other Bar', { ownerId: null });
      const otherCategory = await testSetup.prisma.dbCategory.create({
        data: { name: 'Their drinks', barId: otherBar.id },
      });
      const theirProduct = await testSetup.prisma.dbProduct.create({
        data: { name: 'Their beer', price: 5, currentStock: 10, categoryId: otherCategory.id },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders`)
        .send({ items: [{ productId: theirProduct.id, quantity: 4 }] })
        .expect(404);

      expect(await testSetup.prisma.dbOrder.count({ where: { barId } })).toBe(0);

      const untouched = await testSetup.prisma.dbProduct.findUnique({ where: { id: theirProduct.id } });
      expect(untouched?.currentStock).toBe(10);
    });

    it('should refuse a product that was deleted from the menu', async () => {
      await testSetup.prisma.dbProduct.update({
        where: { id: product1Id },
        data: { deletedAt: new Date() },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders`)
        .send({ items: [{ productId: product1Id, quantity: 1 }] })
        .expect(404);
    });

    it('should accept the same product on two separate lines', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders`)
        .send({
          items: [
            { productId: product1Id, quantity: 2 },
            { productId: product1Id, quantity: 1, notes: 'sin hielo' },
          ],
        })
        .expect(201);

      const orders = await testSetup.prisma.dbOrder.findMany({ where: { barId }, include: { items: true } });

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(15);
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

  describe('POST /api/bars/:barId/orders/merge', () => {
    it('should carry payments, tips and discounts over to the surviving order', async () => {
      const first = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 10,
          amountPaidCash: 400,
          tipAmount: 50,
          items: { create: [{ productId: product1Id, quantity: 2, priceAtPurchase: 5 }] },
          adjustments: { create: [{ target: 'ORDER', type: 'PERCENTAGE', value: 10 }] },
        },
      });

      const second = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 3,
          amountPaidCard: 200,
          tipAmount: 25,
          items: { create: [{ productId: product2Id, quantity: 1, priceAtPurchase: 3 }] },
        },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders/merge`)
        .send({ orderIds: [first.id, second.id] })
        .expect(201);

      const orders = await testSetup.prisma.dbOrder.findMany({
        where: { barId },
        include: { items: true, adjustments: true },
      });

      const survivor = orders.find((order) => order.status === OrderStatus.OPEN);
      const cancelled = orders.filter((order) => order.status === OrderStatus.CANCELLED);

      expect(cancelled).toHaveLength(1);
      expect(survivor?.items).toHaveLength(2);
      expect(survivor?.totalAmount).toBe(13);
      expect(survivor?.amountPaidCash).toBe(400);
      expect(survivor?.amountPaidCard).toBe(200);
      expect(survivor?.tipAmount).toBe(75);
      expect(survivor?.paymentMethod).toBe(PaymentMethod.MIXED);
      expect(survivor?.adjustments).toHaveLength(1);
    });

    it('should keep a percentage discount worth the same euros it was worth before', async () => {
      const discounted = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 1000,
          items: { create: [{ productId: product1Id, quantity: 200, priceAtPurchase: 5 }] },
          adjustments: { create: [{ target: 'ORDER', type: 'PERCENTAGE', value: 10 }] },
        },
      });

      const plain = await testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.OPEN,
          totalAmount: 3,
          items: { create: [{ productId: product2Id, quantity: 1, priceAtPurchase: 3 }] },
        },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders/merge`)
        .send({ orderIds: [discounted.id, plain.id] })
        .expect(201);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany();

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].type).toBe('FIXED_AMOUNT');
      expect(adjustments[0].value).toBe(100);
    });
  });

  describe('an order that is already closed', () => {
    const closedOrder = async () =>
      testSetup.prisma.dbOrder.create({
        data: {
          barId,
          status: OrderStatus.CLOSED,
          totalAmount: 10,
          amountPaidCash: 10,
          items: { create: [{ productId: product1Id, quantity: 2, priceAtPurchase: 5, paidQuantity: 2 }] },
          adjustments: { create: [{ target: 'ORDER', type: 'PERCENTAGE', value: 10 }] },
        },
        include: { adjustments: true },
      });

    it('should refuse a new discount', async () => {
      const order = await closedOrder();

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/orders/${order.id}/adjustments`)
        .send({ target: 'ORDER', type: 'PERCENTAGE', value: 50 })
        .expect(400);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany({ where: { orderId: order.id } });
      expect(adjustments).toHaveLength(1);
    });

    it('should refuse removing a discount it was closed with', async () => {
      const order = await closedOrder();

      await request(testSetup.app.getHttpServer())
        .delete(`/api/bars/${barId}/orders/${order.id}/adjustments/${order.adjustments[0].id}`)
        .expect(400);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany({ where: { orderId: order.id } });
      expect(adjustments).toHaveLength(1);
    });

    it('should refuse changing the tip', async () => {
      const order = await closedOrder();

      await request(testSetup.app.getHttpServer())
        .patch(`/api/bars/${barId}/orders/${order.id}/tip`)
        .send({ tipAmount: 500 })
        .expect(400);

      const unchanged = await testSetup.prisma.dbOrder.findUnique({ where: { id: order.id } });
      expect(unchanged?.tipAmount).toBe(0);
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

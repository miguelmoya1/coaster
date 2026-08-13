import { OrderStatus, PaymentMethod } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('OrdersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
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

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;

    const table = await testSetup.prisma.dbTable.create({
      data: {
        name: 'Table 1',
        establishmentId,
      },
    });
    tableId = table.id;

    const category = await testSetup.prisma.dbCategory.create({
      data: {
        name: 'Drinks',
        establishmentId,
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

  describe('POST /api/establishments/:establishmentId/orders', () => {
    it('should create an order with items', async () => {
      const dto = {
        tableId,
        items: [
          { productId: product1Id, quantity: 2 },
          { productId: product2Id, quantity: 1 },
        ],
      };

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders`)
        .send(dto)
        .expect(201);

      const orders = await testSetup.prisma.dbOrder.findMany({
        where: { establishmentId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].tableId).toBe(tableId);
      expect(orders[0].status).toBe(OrderStatus.OPEN);
      expect(orders[0].items).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(13);
    });

    it('should reject invalid payloads', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders`)
        .send({ items: [] })
        .expect(400);
    });

    it('should refuse a product that belongs to another establishment, leaving its stock alone', async () => {
      const otherEstablishment = await testSetup.createEstablishment('Other Establishment', { ownerId: null });
      const otherCategory = await testSetup.prisma.dbCategory.create({
        data: { name: 'Their drinks', establishmentId: otherEstablishment.id },
      });
      const theirProduct = await testSetup.prisma.dbProduct.create({
        data: { name: 'Their beer', price: 5, currentStock: 10, categoryId: otherCategory.id },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders`)
        .send({ items: [{ productId: theirProduct.id, quantity: 4 }] })
        .expect(404);

      expect(await testSetup.prisma.dbOrder.count({ where: { establishmentId } })).toBe(0);

      const untouched = await testSetup.prisma.dbProduct.findUnique({ where: { id: theirProduct.id } });
      expect(untouched?.currentStock).toBe(10);
    });

    it('should refuse a product that was deleted from the menu', async () => {
      await testSetup.prisma.dbProduct.update({
        where: { id: product1Id },
        data: { deletedAt: new Date() },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders`)
        .send({ items: [{ productId: product1Id, quantity: 1 }] })
        .expect(404);
    });

    it('should accept the same product on two separate lines', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders`)
        .send({
          items: [
            { productId: product1Id, quantity: 2 },
            { productId: product1Id, quantity: 1, notes: 'sin hielo' },
          ],
        })
        .expect(201);

      const orders = await testSetup.prisma.dbOrder.findMany({ where: { establishmentId }, include: { items: true } });

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(2);
      expect(orders[0].totalAmount).toBe(15);
    });
  });

  describe('GET /api/establishments/:establishmentId/orders', () => {
    it('should return a list of orders', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
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

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishmentId}/orders`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(order.id);
      expect(response.body[0].totalAmount).toBe(5);
    });
  });

  describe('POST /api/establishments/:establishmentId/orders/:orderId/items', () => {
    it('should add items to an existing order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
          totalAmount: 0,
        },
      });

      const dto = {
        items: [{ productId: product1Id, quantity: 1 }],
      };

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders/${order.id}/items`)
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

  describe('POST /api/establishments/:establishmentId/orders/:orderId/cancel', () => {
    it('should cancel an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
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

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders/${order.id}/cancel`)
        .expect(201);

      const updated = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(updated?.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('POST /api/establishments/:establishmentId/orders/:orderId/checkout', () => {
    it('should checkout an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
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
        .post(`/api/establishments/${establishmentId}/orders/${order.id}/checkout`)
        .send({ paymentMethod: PaymentMethod.CASH })
        .expect(201);

      const updated = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(updated?.status).toBe(OrderStatus.CLOSED);
      expect(updated?.paymentMethod).toBe(PaymentMethod.CASH);
    });
  });

  describe('POST /api/establishments/:establishmentId/orders/merge', () => {
    it('should carry payments, tips and discounts over to the surviving order', async () => {
      const first = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
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
          establishmentId,
          status: OrderStatus.OPEN,
          totalAmount: 3,
          amountPaidCard: 200,
          tipAmount: 25,
          items: { create: [{ productId: product2Id, quantity: 1, priceAtPurchase: 3 }] },
        },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders/merge`)
        .send({ orderIds: [first.id, second.id] })
        .expect(201);

      const orders = await testSetup.prisma.dbOrder.findMany({
        where: { establishmentId },
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
          establishmentId,
          status: OrderStatus.OPEN,
          totalAmount: 1000,
          items: { create: [{ productId: product1Id, quantity: 200, priceAtPurchase: 5 }] },
          adjustments: { create: [{ target: 'ORDER', type: 'PERCENTAGE', value: 10 }] },
        },
      });

      const plain = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
          status: OrderStatus.OPEN,
          totalAmount: 3,
          items: { create: [{ productId: product2Id, quantity: 1, priceAtPurchase: 3 }] },
        },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders/merge`)
        .send({ orderIds: [discounted.id, plain.id] })
        .expect(201);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany();

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].type).toBe('FIXED_AMOUNT');
      expect(adjustments[0].value).toBe(100);
    });
  });

  describe('PATCH /api/establishments/:establishmentId/orders/:orderId/items/bulk', () => {
    const openOrder = async () =>
      testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
          status: OrderStatus.OPEN,
          totalAmount: 1000,
          items: { create: [{ productId: product1Id, quantity: 2, priceAtPurchase: 500 }] },
        },
        include: { items: true },
      });

    it('should mark an item as served', async () => {
      const order = await openOrder();

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/orders/${order.id}/items/bulk`)
        .send({ items: [{ itemId: order.items[0].id, servedQuantity: 2 }] })
        .expect(200);

      const item = await testSetup.prisma.dbOrderItem.findUniqueOrThrow({ where: { id: order.items[0].id } });
      expect(item.servedQuantity).toBe(2);
      expect(item.deliveryStatus).toBe('SERVED');
    });

    it('should take payment for part of an item', async () => {
      const order = await openOrder();

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/orders/${order.id}/items/bulk`)
        .send({ items: [{ itemId: order.items[0].id, paidQuantity: 1, paymentMethod: PaymentMethod.CARD }] })
        .expect(200);

      const item = await testSetup.prisma.dbOrderItem.findUniqueOrThrow({ where: { id: order.items[0].id } });
      expect(item.paidQuantity).toBe(1);
      expect(item.paidQuantityCard).toBe(1);
      expect(item.paymentStatus).toBe('PARTIAL');

      const updated = await testSetup.prisma.dbOrder.findUniqueOrThrow({ where: { id: order.id } });
      expect(updated.amountPaidCard).toBe(500);
    });

    it('should refuse to serve more units than the order has', async () => {
      const order = await openOrder();

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/orders/${order.id}/items/bulk`)
        .send({ items: [{ itemId: order.items[0].id, servedQuantity: 5 }] })
        .expect(400);
    });

    it('should refuse to touch a closed order', async () => {
      const order = await openOrder();
      await testSetup.prisma.dbOrder.update({ where: { id: order.id }, data: { status: OrderStatus.CLOSED } });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/orders/${order.id}/items/bulk`)
        .send({ items: [{ itemId: order.items[0].id, servedQuantity: 1 }] })
        .expect(400);
    });
  });

  describe('two people closing the same order at once', () => {
    it('should take the money once and turn the other attempt down', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
          status: OrderStatus.OPEN,
          totalAmount: 1000,
          items: { create: [{ productId: product1Id, quantity: 1, priceAtPurchase: 1000 }] },
        },
      });

      const checkout = () =>
        request(testSetup.app.getHttpServer())
          .post(`/api/establishments/${establishmentId}/orders/${order.id}/checkout`)
          .send({ paymentMethod: PaymentMethod.CASH });

      const results = await Promise.all([checkout(), checkout()]);
      const statuses = results.map((response) => response.status).sort();

      expect(statuses).toEqual([201, 400]);

      const closed = await testSetup.prisma.dbOrder.findUnique({ where: { id: order.id } });
      expect(closed?.status).toBe(OrderStatus.CLOSED);
      expect(closed?.amountPaidCash).toBe(1000);
    });

    it('should refuse a payment method that says nothing about how it was paid', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: { establishmentId, status: OrderStatus.OPEN, totalAmount: 500 },
      });

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/orders/${order.id}/checkout`)
        .send({ paymentMethod: PaymentMethod.NONE })
        .expect(400);

      const untouched = await testSetup.prisma.dbOrder.findUnique({ where: { id: order.id } });
      expect(untouched?.status).toBe(OrderStatus.OPEN);
    });
  });

  describe('an order that is already closed', () => {
    const closedOrder = async () =>
      testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
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
        .post(`/api/establishments/${establishmentId}/orders/${order.id}/adjustments`)
        .send({ target: 'ORDER', type: 'PERCENTAGE', value: 50 })
        .expect(400);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany({ where: { orderId: order.id } });
      expect(adjustments).toHaveLength(1);
    });

    it('should refuse removing a discount it was closed with', async () => {
      const order = await closedOrder();

      await request(testSetup.app.getHttpServer())
        .delete(`/api/establishments/${establishmentId}/orders/${order.id}/adjustments/${order.adjustments[0].id}`)
        .expect(400);

      const adjustments = await testSetup.prisma.dbOrderAdjustment.findMany({ where: { orderId: order.id } });
      expect(adjustments).toHaveLength(1);
    });

    it('should refuse changing the tip', async () => {
      const order = await closedOrder();

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/orders/${order.id}/tip`)
        .send({ tipAmount: 500 })
        .expect(400);

      const unchanged = await testSetup.prisma.dbOrder.findUnique({ where: { id: order.id } });
      expect(unchanged?.tipAmount).toBe(0);
    });
  });

  describe('DELETE /api/establishments/:establishmentId/orders/:orderId', () => {
    it('should delete an order', async () => {
      const order = await testSetup.prisma.dbOrder.create({
        data: {
          establishmentId,
          status: OrderStatus.CLOSED,
        },
      });

      await request(testSetup.app.getHttpServer())
        .delete(`/api/establishments/${establishmentId}/orders/${order.id}`)
        .expect(200);

      const deleted = await testSetup.prisma.dbOrder.findUnique({
        where: { id: order.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

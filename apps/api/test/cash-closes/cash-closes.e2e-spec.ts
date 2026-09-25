import type { CashClose, CashClosePreview } from '@coaster/common';
import { ErrorCodes, OrderStatus, PaymentMethod } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const manager = {
  id: '00000000-0000-4000-8000-0000000000b1',
  email: 'manager@example.com',
  name: 'Manager',
};

const staff = {
  id: '00000000-0000-4000-8000-0000000000b2',
  email: 'staff@example.com',
  name: 'Staff',
};

describe('CashClosesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();
  let establishmentId: string;
  let productId: string;

  const base = () => `/api/establishments/${establishmentId}`;

  const openOrder = async () => {
    await request(http())
      .post(`${base()}/orders`)
      .send({ items: [{ productId, quantity: 1 }] })
      .expect(201);

    const orders = await testSetup.prisma.dbOrder.findMany({
      where: { establishmentId, status: OrderStatus.OPEN },
      orderBy: { createdAt: 'desc' },
    });

    return orders[0].id;
  };

  const sell = async (paymentMethod: PaymentMethod, tipAmount = 0) => {
    const orderId = await openOrder();

    if (tipAmount) {
      await request(http()).patch(`${base()}/orders/${orderId}/tip`).send({ tipAmount }).expect(200);
    }

    await request(http()).post(`${base()}/orders/${orderId}/checkout`).send({ paymentMethod }).expect(201);

    return orderId;
  };

  const preview = async () => {
    const { body } = await request(http()).get(`${base()}/cash-closes/preview`).expect(200);
    return body as CashClosePreview;
  };

  const close = async (openingFloat: number, countedCash: number) => {
    const { body } = await request(http())
      .post(`${base()}/cash-closes`)
      .send({ openingFloat, countedCash, notes: 'Sin incidencias' })
      .expect(201);
    return body as CashClose;
  };

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [mockUser, manager, staff].map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'USER',
        active: true,
      })),
    });

    const establishment = await testSetup.createEstablishment('The Bar');
    establishmentId = establishment.id;

    await testSetup.prisma.dbEstablishmentMember.createMany({
      data: [
        { userId: manager.id, establishmentId, role: DbEstablishmentRole.MANAGER },
        { userId: staff.id, establishmentId, role: DbEstablishmentRole.STAFF },
      ],
    });

    testSetup.actAs(manager);
    testSetup.actAs(staff);

    const category = await testSetup.prisma.dbCategory.create({ data: { name: 'Drinks', establishmentId } });
    const product = await testSetup.prisma.dbProduct.create({
      data: { name: 'Beer', price: 1000, categoryId: category.id },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  it('should preview what the till took since the last close, by how it was paid', async () => {
    await sell(PaymentMethod.CASH, 200);
    await sell(PaymentMethod.CARD);
    const cancelledId = await openOrder();
    await request(http()).post(`${base()}/orders/${cancelledId}/cancel`).expect(201);

    expect(await preview()).toEqual({
      closedOrders: 2,
      cancelledOrders: 1,
      cancelledAmount: 1100,
      cashAmount: 1300,
      cardAmount: 1100,
      tipAmount: 200,
      since: null,
      openOrders: 0,
      openOrdersCharged: 0,
      openingFloat: 0,
    });
  });

  it('should close with the arqueo, and leave the next close empty and starting where this one ended', async () => {
    await sell(PaymentMethod.CASH);
    await sell(PaymentMethod.CASH);

    const cashClose = await close(15000, 17100);

    expect(cashClose).toMatchObject({
      closedById: mockUser.id,
      closedByName: mockUser.name,
      since: null,
      closedOrders: 2,
      cashAmount: 2200,
      openingFloat: 15000,
      countedCash: 17100,
      expectedCash: 17200,
      difference: -100,
      notes: 'Sin incidencias',
    });

    const next = await preview();
    expect(next.closedOrders).toBe(0);
    expect(next.cashAmount).toBe(0);
    expect(next.since).toBe(cashClose.closedAt);
    expect(next.openingFloat).toBe(15000);

    const { body: history } = await request(http()).get(`${base()}/cash-closes`).expect(200);
    expect((history as CashClose[]).map((c) => c.id)).toEqual([cashClose.id]);
  });

  it('should leave an open order out, warn about what it already charged, and count it once it is paid', async () => {
    const tabId = await openOrder();
    const [item] = await testSetup.prisma.dbOrderItem.findMany({ where: { orderId: tabId } });
    await request(http())
      .patch(`${base()}/orders/${tabId}/items/bulk`)
      .send({ items: [{ itemId: item.id, paidQuantity: 1, paymentMethod: PaymentMethod.CASH }] })
      .expect(200);

    const before = await preview();
    expect(before.openOrders).toBe(1);
    expect(before.openOrdersCharged).toBe(1100);

    const first = await close(0, 0);
    expect(first.closedOrders).toBe(0);

    await request(http())
      .post(`${base()}/orders/${tabId}/checkout`)
      .send({ paymentMethod: PaymentMethod.CASH })
      .expect(201);

    const second = await close(0, 1100);
    expect(second.closedOrders).toBe(1);
    expect(second.cashAmount).toBe(1100);
    expect(second.difference).toBe(0);
  });

  it('should refuse to delete an order a close has already counted', async () => {
    const orderId = await sell(PaymentMethod.CASH);
    await close(0, 1100);

    const { body } = await request(http()).delete(`${base()}/orders/${orderId}`).expect(400);

    expect(JSON.stringify(body)).toContain(ErrorCodes.ORDER_IN_CASH_CLOSE);
    expect(await testSetup.prisma.dbOrder.count({ where: { id: orderId } })).toBe(1);
  });

  it('should let a manager close the till and keep staff out of it', async () => {
    await request(http()).get(`${base()}/cash-closes/preview`).set(testSetup.actAs(manager)).expect(200);
    await request(http())
      .post(`${base()}/cash-closes`)
      .set(testSetup.actAs(manager))
      .send({ openingFloat: 0, countedCash: 0 })
      .expect(201);

    await request(http()).get(`${base()}/cash-closes/preview`).set(testSetup.actAs(staff)).expect(403);
    await request(http()).get(`${base()}/cash-closes`).set(testSetup.actAs(staff)).expect(403);
    await request(http())
      .post(`${base()}/cash-closes`)
      .set(testSetup.actAs(staff))
      .send({ openingFloat: 0, countedCash: 0 })
      .expect(403);
  });

  it('should reject a negative count', async () => {
    await request(http()).post(`${base()}/cash-closes`).send({ openingFloat: 0, countedCash: -1 }).expect(400);
  });
});

import { OrderStatus, PaymentMethod } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const manager = {
  id: '00000000-0000-4000-8000-0000000000a1',
  email: 'manager@example.com',
  name: 'Manager',
};

const staff = {
  id: '00000000-0000-4000-8000-0000000000a2',
  email: 'staff@example.com',
  name: 'Staff',
};

const outsider = {
  id: '00000000-0000-4000-8000-0000000000a3',
  email: 'outsider@example.com',
  name: 'Outsider',
};

describe('Dashboard access per role (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;

  const http = () => testSetup.app.getHttpServer();
  const asOwner = () => ({ 'x-e2e-user-id': mockUser.id });

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [mockUser, manager, staff, outsider].map((user) => ({
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
    testSetup.actAs(outsider);

    await testSetup.prisma.dbOrder.create({
      data: {
        establishmentId,
        status: OrderStatus.CLOSED,
        totalAmount: 1000,
        amountPaidCash: 1000,
        paymentMethod: PaymentMethod.CASH,
      },
    });
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('GET /stats', () => {
    it('should hand the owner the whole picture, month and year included', async () => {
      const { body } = await request(http())
        .get(`/api/establishments/${establishmentId}/stats`)
        .set(asOwner())
        .expect(200);

      expect(body.todayRevenue).toBe(1000);
      expect(body.history).not.toBeNull();
      expect(body.history.yearlyRevenue).toBe(1000);
      expect(body.history.monthlyBreakdown).toHaveLength(12);
    });

    it('should give the manager the daily takings but withhold the history', async () => {
      const { body } = await request(http())
        .get(`/api/establishments/${establishmentId}/stats`)
        .set(testSetup.actAs(manager))
        .expect(200);

      expect(body.todayRevenue).toBe(1000);
      expect(body.todayTicketCount).toBe(1);
      expect(body.history).toBeNull();
    });

    it('should not leak a single figure of the year to a manager, whatever they ask for', async () => {
      const { text } = await request(http())
        .get(`/api/establishments/${establishmentId}/stats`)
        .set(testSetup.actAs(manager))
        .expect(200);

      expect(text).not.toContain('yearlyRevenue');
      expect(text).not.toContain('currentMonthRevenue');
      expect(text).not.toContain('monthlyBreakdown');
    });

    it('should refuse the takings to a floor staff member', async () => {
      await request(http())
        .get(`/api/establishments/${establishmentId}/stats`)
        .set(testSetup.actAs(staff))
        .expect(403);
    });

    it('should refuse the takings to somebody who does not work here', async () => {
      await request(http())
        .get(`/api/establishments/${establishmentId}/stats`)
        .set(testSetup.actAs(outsider))
        .expect(403);
    });
  });

  describe('owner-only ground', () => {
    it('should let no manager touch the billing portal', async () => {
      await request(http())
        .post(`/api/establishments/${establishmentId}/establishment-subscription/customer-portal-session`)
        .set(testSetup.actAs(manager))
        .send({})
        .expect(403);
    });

    it('should let no staff member remove a colleague', async () => {
      const membership = await testSetup.prisma.dbEstablishmentMember.findFirstOrThrow({
        where: { establishmentId, userId: manager.id },
      });

      await request(http())
        .delete(`/api/establishments/${establishmentId}/members/${membership.id}`)
        .set(testSetup.actAs(staff))
        .expect(403);
    });
  });

  describe('ground the floor staff is meant to stand on', () => {
    it('should let a staff member read the shifts they are rostered for', async () => {
      await request(http())
        .get(`/api/establishments/${establishmentId}/shifts`)
        .set(testSetup.actAs(staff))
        .expect(200);
    });

    it('should let a staff member read their own time entries', async () => {
      await request(http())
        .get(`/api/establishments/${establishmentId}/time-entries/me?from=2026-01-01&to=2026-12-31`)
        .set(testSetup.actAs(staff))
        .expect(200);
    });

    it('should keep the team timesheet away from a staff member', async () => {
      await request(http())
        .get(`/api/establishments/${establishmentId}/time-entries?from=2026-01-01&to=2026-12-31`)
        .set(testSetup.actAs(staff))
        .expect(403);
    });
  });

  describe('order attribution', () => {
    it('should record which staff member opened the order', async () => {
      const category = await testSetup.prisma.dbCategory.create({ data: { name: 'Drinks', establishmentId } });
      const product = await testSetup.prisma.dbProduct.create({
        data: { name: 'Beer', price: 250, categoryId: category.id },
      });

      await request(http())
        .post(`/api/establishments/${establishmentId}/orders`)
        .set(testSetup.actAs(staff))
        .send({ items: [{ productId: product.id, quantity: 1 }] })
        .expect(201);

      const order = await testSetup.prisma.dbOrder.findFirstOrThrow({
        where: { establishmentId, status: OrderStatus.OPEN },
      });

      expect(order.createdById).toBe(staff.id);
    });
  });
});

import { EstablishmentModule, ErrorCodes, TimeEntryType } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

/**
 * The point of the whole phase: an establishment that only keeps the legal working-time register
 * must be able to run without the hospitality half of the product existing for it at all.
 */
describe('Module gating (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  let timeTrackingOnlyId: string;
  let fullEstablishmentId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
    });

    const office = await testSetup.createEstablishment('Gestoría', {
      modules: [EstablishmentModule.TIME_TRACKING],
    });
    timeTrackingOnlyId = office.id;

    const venue = await testSetup.createEstablishment('El Bar');
    fullEstablishmentId = venue.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('an establishment with only time tracking', () => {
    it('should refuse to list its tables, because it has none to have', async () => {
      const response = await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/tables`).expect(403);

      expect(response.body.message).toBe(ErrorCodes.MODULE_NOT_ENABLED);
    });

    it('should refuse to open an order', async () => {
      await request(http()).post(`/api/establishments/${timeTrackingOnlyId}/orders`).send({}).expect(403);
    });

    it('should refuse to list its products', async () => {
      await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/products`).expect(403);
    });

    it('should refuse to list its categories', async () => {
      await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/categories`).expect(403);
    });

    it('should still let its staff clock in, which is the reason it is here at all', async () => {
      await request(http())
        .post(`/api/establishments/${timeTrackingOnlyId}/time-entries/clock`)
        .send({ type: TimeEntryType.CLOCK_IN })
        .expect(201);
    });

    it('should still list its members', async () => {
      await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/members`).expect(200);
    });

    it('should still list its shifts', async () => {
      await request(http())
        .get(`/api/establishments/${timeTrackingOnlyId}/shifts`)
        .query({ start: '2026-01-01T00:00:00.000Z', end: '2026-12-31T00:00:00.000Z' })
        .expect(200);
    });
  });

  describe('an establishment running everything', () => {
    it('should list its tables', async () => {
      await request(http()).get(`/api/establishments/${fullEstablishmentId}/tables`).expect(200);
    });

    it('should list its products', async () => {
      await request(http()).get(`/api/establishments/${fullEstablishmentId}/products`).expect(200);
    });
  });

  describe('changing the modules', () => {
    it('should let an owner switch a module on and take effect straight away', async () => {
      await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/products`).expect(403);

      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.INVENTORY] })
        .expect(200);

      await request(http()).get(`/api/establishments/${timeTrackingOnlyId}/products`).expect(200);
    });

    it('should keep what the owner asked about marking sold out', async () => {
      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.INVENTORY], markSoldOut: true })
        .expect(200);

      const settings = await testSetup.prisma.dbEstablishmentSettings.findUnique({
        where: { establishmentId: timeTrackingOnlyId },
      });

      expect(settings?.markSoldOut).toBe(true);
    });

    it('should hand the setting back on the response, so the screen does not have to guess', async () => {
      const { body } = await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.INVENTORY], markSoldOut: true, language: 'en' })
        .expect(200);

      expect(body.markSoldOut).toBe(true);
      expect(body.language).toBe('en');
    });

    it('should leave the setting alone when the request does not mention it', async () => {
      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.INVENTORY], markSoldOut: true })
        .expect(200);

      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.INVENTORY] })
        .expect(200);

      const settings = await testSetup.prisma.dbEstablishmentSettings.findUnique({
        where: { establishmentId: timeTrackingOnlyId },
      });

      expect(settings?.markSoldOut).toBe(true);
    });

    it('should refuse a member who is not an owner', async () => {
      const staff = await testSetup.prisma.dbUser.create({
        data: { email: 'staff@example.com', name: 'Staff', role: 'USER', active: true },
      });
      await testSetup.prisma.dbEstablishmentMember.create({
        data: { userId: staff.id, establishmentId: timeTrackingOnlyId, role: 'STAFF' },
      });

      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .set(testSetup.actAs({ id: staff.id, email: 'staff@example.com', name: 'Staff' }))
        .send({ modules: [EstablishmentModule.INVENTORY] })
        .expect(403);
    });

    it('should refuse a module name it does not know', async () => {
      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: ['RESERVATIONS'] })
        .expect(400);
    });

    it('should mark the establishment configured, so the onboarding never asks twice', async () => {
      const before = await testSetup.prisma.dbEstablishmentSettings.findUnique({
        where: { establishmentId: timeTrackingOnlyId },
      });
      expect(before?.configuredAt).toBeNull();

      await request(http())
        .patch(`/api/establishments/${timeTrackingOnlyId}/settings`)
        .send({ modules: [EstablishmentModule.ORDERS] })
        .expect(200);

      const after = await testSetup.prisma.dbEstablishmentSettings.findUnique({
        where: { establishmentId: timeTrackingOnlyId },
      });
      expect(after?.configuredAt).not.toBeNull();
    });
  });

  it('should turn inventory on by itself when orders is asked for, or the till has nothing to sell', async () => {
    const shop = await testSetup.createEstablishment('Solo comandas', {
      modules: [EstablishmentModule.ORDERS],
    });

    const settings = await testSetup.prisma.dbEstablishmentSettings.findUnique({
      where: { establishmentId: shop.id },
    });

    expect(settings?.modules).toContain(EstablishmentModule.INVENTORY);
  });
});

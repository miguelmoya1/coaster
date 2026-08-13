import { EstablishmentRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('ShiftExchangesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let shiftId: string;

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

    const shift = await testSetup.prisma.dbShift.create({
      data: {
        userId: mockUser.id,
        establishmentId,
        // A shift somebody could still take over: offering one that is already running is refused.
        startTime: new Date(Date.now() + 3600 * 1000),
        endTime: new Date(Date.now() + 5 * 3600 * 1000),
      },
    });
    shiftId = shift.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/establishments/:establishmentId/shifts/:shiftId/exchanges', () => {
    it('should request a shift exchange', async () => {
      const dto = {};

      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/shifts/${shiftId}/exchanges`)
        .send(dto)
        .expect(201);

      const exchanges = await testSetup.prisma.dbShiftExchange.findMany({
        where: { shift: { establishmentId } },
      });

      expect(exchanges).toHaveLength(1);
      expect(exchanges[0].shiftId).toBe(shiftId);
      expect(exchanges[0].requesterId).toBe(mockUser.id);
      expect(exchanges[0].status).toBe('PENDING');
    });
  });

  describe('GET /api/establishments/:establishmentId/exchanges', () => {
    it('should return pending exchanges', async () => {
      const exchange = await testSetup.prisma.dbShiftExchange.create({
        data: {
          shiftId,
          requesterId: mockUser.id,
          status: 'PENDING',
        },
      });

      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishmentId}/exchanges`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(exchange.id);
    });
  });

  describe('PATCH /api/establishments/:establishmentId/exchanges/:exchangeId/accept', () => {
    it('should accept a shift exchange', async () => {
      const otherUser = await testSetup.prisma.dbUser.create({
        data: {
          email: 'other@example.com',
          name: 'Other',
        },
      });

      await testSetup.prisma.dbEstablishmentMember.create({
        data: {
          establishmentId,
          userId: otherUser.id,
          role: EstablishmentRole.STAFF,
        },
      });

      const exchange = await testSetup.prisma.dbShiftExchange.create({
        data: {
          shiftId,
          requesterId: otherUser.id,
          targetId: mockUser.id,
          status: 'PENDING',
        },
      });

      await request(testSetup.app.getHttpServer())
        .patch(`/api/establishments/${establishmentId}/exchanges/${exchange.id}/accept`)
        .expect(200);

      const updated = await testSetup.prisma.dbShiftExchange.findUnique({
        where: { id: exchange.id },
      });
      expect(updated?.status).toBe('APPROVED');
    });
  });

  describe('DELETE /api/establishments/:establishmentId/exchanges/:exchangeId', () => {
    it('should delete (cancel) a shift exchange', async () => {
      const exchange = await testSetup.prisma.dbShiftExchange.create({
        data: {
          shiftId,
          requesterId: mockUser.id,
          status: 'PENDING',
        },
      });

      await request(testSetup.app.getHttpServer())
        .delete(`/api/establishments/${establishmentId}/exchanges/${exchange.id}`)
        .expect(200);

      const deleted = await testSetup.prisma.dbShiftExchange.findUnique({
        where: { id: exchange.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

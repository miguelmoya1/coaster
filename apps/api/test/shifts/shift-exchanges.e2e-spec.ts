import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('ShiftExchangesController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let shiftId: string;

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

    // Seed a shift
    const shift = await testSetup.prisma.dbShift.create({
      data: {
        userId: mockUser.id,
        barId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600 * 1000),
      },
    });
    shiftId = shift.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/shifts/:shiftId/exchanges', () => {
    it('should request a shift exchange', async () => {
      const dto = {}; // Dto might have optional targetId

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/shifts/${shiftId}/exchanges`)
        .send(dto)
        .expect(201);

      // Verify in database
      const exchanges = await testSetup.prisma.dbShiftExchange.findMany({
        where: { shift: { barId } },
      });

      expect(exchanges).toHaveLength(1);
      expect(exchanges[0].shiftId).toBe(shiftId);
      expect(exchanges[0].requesterId).toBe(mockUser.id);
      expect(exchanges[0].status).toBe('PENDING');
    });
  });

  describe('GET /api/bars/:barId/exchanges', () => {
    it('should return pending exchanges', async () => {
      const exchange = await testSetup.prisma.dbShiftExchange.create({
        data: {
          shiftId,
          requesterId: mockUser.id,
          status: 'PENDING',
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/exchanges`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(exchange.id);
    });
  });

  describe('PATCH /api/bars/:barId/exchanges/:exchangeId/accept', () => {
    it('should accept a shift exchange', async () => {
      // Need a second user to accept
      const otherUser = await testSetup.prisma.dbUser.create({
        data: {
          email: 'other@example.com',
          name: 'Other',
        },
      });

      await testSetup.prisma.dbBarMember.create({
        data: {
          barId,
          userId: otherUser.id,
          role: BarRole.STAFF,
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
        .patch(`/api/bars/${barId}/exchanges/${exchange.id}/accept`)
        .expect(200);

      const updated = await testSetup.prisma.dbShiftExchange.findUnique({
        where: { id: exchange.id },
      });
      expect(updated?.status).toBe('APPROVED');
    });
  });

  describe('DELETE /api/bars/:barId/exchanges/:exchangeId', () => {
    it('should delete (cancel) a shift exchange', async () => {
      const exchange = await testSetup.prisma.dbShiftExchange.create({
        data: {
          shiftId,
          requesterId: mockUser.id,
          status: 'PENDING',
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/exchanges/${exchange.id}`).expect(200);

      const deleted = await testSetup.prisma.dbShiftExchange.findUnique({
        where: { id: exchange.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

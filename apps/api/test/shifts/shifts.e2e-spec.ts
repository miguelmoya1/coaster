import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('ShiftsController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let userId: string;

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    await testSetup.clearDatabase();

    // Seed the mock user
    const user = await testSetup.prisma.dbUser.create({
      data: {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'USER',
        active: true,
      },
    });
    userId = user.id;

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
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('POST /api/bars/:barId/shifts', () => {
    it('should create a shift', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const dto = {
        userId,
        startTime: now.toISOString(),
        endTime: tomorrow.toISOString(),
        notes: 'Morning shift',
      };

      const response = await request(testSetup.app.getHttpServer()).post(`/api/bars/${barId}/shifts`).send(dto);

      expect(response.status).toBe(201);

      // Verify in database
      const shifts = await testSetup.prisma.dbShift.findMany({
        where: { barId },
      });

      expect(shifts).toHaveLength(1);
      expect(shifts[0].userId).toBe(userId);
      expect(shifts[0].notes).toBe('Morning shift');
    });

    it('should reject invalid payload (missing userId)', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/shifts`)
        .send({
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('GET /api/bars/:barId/shifts', () => {
    it('should return a list of shifts', async () => {
      const shift = await testSetup.prisma.dbShift.create({
        data: {
          userId,
          barId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600 * 1000),
          notes: 'Test shift',
        },
      });

      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/shifts`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(shift.id);
      expect(response.body[0].notes).toBe('Test shift');
    });
  });

  describe('DELETE /api/bars/:barId/shifts/:shiftId', () => {
    it('should delete a shift', async () => {
      const shift = await testSetup.prisma.dbShift.create({
        data: {
          userId,
          barId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600 * 1000),
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/shifts/${shift.id}`).expect(200);

      const deleted = await testSetup.prisma.dbShift.findUnique({
        where: { id: shift.id },
      });
      expect(deleted).toBeNull();
    });
  });
});

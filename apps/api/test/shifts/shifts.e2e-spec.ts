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

    const bar = await testSetup.createBar('My Bar');
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

    it('should refuse to schedule somebody who does not work at this bar', async () => {
      const stranger = await testSetup.prisma.dbUser.create({
        data: { email: 'stranger@elsewhere.com', name: 'Stranger', role: 'USER', active: true },
      });
      const now = new Date();

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/shifts`)
        .send({
          userId: stranger.id,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() + 3600_000).toISOString(),
        })
        .expect(404);

      expect(await testSetup.prisma.dbShift.count({ where: { barId } })).toBe(0);
    });

    it('should refuse a shift that ends before it starts', async () => {
      const now = new Date();

      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/shifts`)
        .send({
          userId,
          startTime: now.toISOString(),
          endTime: new Date(now.getTime() - 3600_000).toISOString(),
        })
        .expect(400);

      expect(await testSetup.prisma.dbShift.count({ where: { barId } })).toBe(0);
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

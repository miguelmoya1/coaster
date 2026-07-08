import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('BarMembersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let barId: string;
  let otherUserId: string;

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

    // Seed another user
    const otherUser = await testSetup.prisma.dbUser.create({
      data: {
        id: 'other-user-id',
        email: 'other@example.com',
        name: 'Other User',
        role: 'USER',
        active: true,
      },
    });
    otherUserId = otherUser.id;

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

  describe('GET /api/bars/:barId/members/me', () => {
    it('should return my membership', async () => {
      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/members/me`).expect(200);

      expect(response.body.userId).toBe(mockUser.id);
      expect(response.body.role).toBe(BarRole.OWNER);
      expect(response.body.barId).toBe(barId);
    });
  });

  describe('GET /api/bars/:barId/members', () => {
    it('should list members if user has permission', async () => {
      const response = await request(testSetup.app.getHttpServer()).get(`/api/bars/${barId}/members`).expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(mockUser.id);
    });

    it('should return 403 if user lacks permission', async () => {
      const otherBar = await testSetup.prisma.dbBar.create({
        data: { name: 'Unauthorized Bar' },
      });

      await request(testSetup.app.getHttpServer()).get(`/api/bars/${otherBar.id}/members`).expect(403);
    });
  });

  describe('POST /api/bars/:barId/members', () => {
    it('should invite a new member if user is OWNER', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/members`)
        .send({ email: 'other@example.com', role: BarRole.STAFF })
        .expect(201);

      // Verify in DB
      const members = await testSetup.prisma.dbBarMember.findMany({
        where: { barId },
      });
      expect(members).toHaveLength(2);
      expect(members.some((m) => m.userId === otherUserId && m.role === BarRole.STAFF)).toBe(true);
    });

    it('should return 400 for invalid email', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/bars/${barId}/members`)
        .send({ email: 'not-an-email', role: BarRole.STAFF })
        .expect(400);
    });
  });

  describe('DELETE /api/bars/:barId/members/:memberId', () => {
    it('should remove a member if user has permission', async () => {
      // First, add another member
      const newMember = await testSetup.prisma.dbBarMember.create({
        data: {
          barId,
          userId: otherUserId,
          role: BarRole.STAFF,
        },
      });

      await request(testSetup.app.getHttpServer()).delete(`/api/bars/${barId}/members/${newMember.id}`).expect(200);

      // Verify in DB
      const deletedMember = await testSetup.prisma.dbBarMember.findUnique({
        where: { id: newMember.id },
      });

      expect(deletedMember?.deletedAt).not.toBeNull();
    });
  });
});

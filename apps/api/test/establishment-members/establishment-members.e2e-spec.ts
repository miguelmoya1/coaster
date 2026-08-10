import { EstablishmentRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

describe('EstablishmentMembersController (e2e)', () => {
  const testSetup = new E2eTestSetup();
  let establishmentId: string;
  let otherUserId: string;

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

    const establishment = await testSetup.createEstablishment('My Establishment');
    establishmentId = establishment.id;
  });

  afterAll(async () => {
    await testSetup.teardown();
  });

  describe('GET /api/establishments/:establishmentId/members/me', () => {
    it('should return my membership', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishmentId}/members/me`)
        .expect(200);

      expect(response.body.userId).toBe(mockUser.id);
      expect(response.body.role).toBe(EstablishmentRole.OWNER);
      expect(response.body.establishmentId).toBe(establishmentId);
    });
  });

  describe('GET /api/establishments/:establishmentId/members', () => {
    it('should list members if user has permission', async () => {
      const response = await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${establishmentId}/members`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(mockUser.id);
    });

    it('should return 403 if user lacks permission', async () => {
      const otherEstablishment = await testSetup.createEstablishment('Unauthorized Establishment', { ownerId: null });

      await request(testSetup.app.getHttpServer())
        .get(`/api/establishments/${otherEstablishment.id}/members`)
        .expect(403);
    });
  });

  describe('POST /api/establishments/:establishmentId/members', () => {
    it('should invite a new member if user is OWNER', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/members`)
        .send({ email: 'other@example.com', role: EstablishmentRole.STAFF })
        .expect(201);

      const members = await testSetup.waitForMembers(establishmentId, 2);
      expect(members).toHaveLength(2);
      expect(members.some((m) => m.userId === otherUserId && m.role === EstablishmentRole.STAFF)).toBe(true);
    });

    it('should return 400 for invalid email', async () => {
      await request(testSetup.app.getHttpServer())
        .post(`/api/establishments/${establishmentId}/members`)
        .send({ email: 'not-an-email', role: EstablishmentRole.STAFF })
        .expect(400);
    });
  });

  describe('DELETE /api/establishments/:establishmentId/members/:memberId', () => {
    it('should remove a member if user has permission', async () => {
      const newMember = await testSetup.prisma.dbEstablishmentMember.create({
        data: {
          establishmentId,
          userId: otherUserId,
          role: EstablishmentRole.STAFF,
        },
      });

      await request(testSetup.app.getHttpServer())
        .delete(`/api/establishments/${establishmentId}/members/${newMember.id}`)
        .expect(200);

      const deletedMember = await testSetup.prisma.dbEstablishmentMember.findUnique({
        where: { id: newMember.id },
      });

      expect(deletedMember?.deletedAt).not.toBeNull();
    });
  });
});

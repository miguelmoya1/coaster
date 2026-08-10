import { EstablishmentRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const REMOVED_USER_ID = '00000000-0000-4000-8000-0000000000b1';

describe('Access revocation (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  /*
   * Inviting answers as soon as the command is accepted; the membership itself lands later, when the
   * saga behind it has run. Tests that look at the row have to wait for it instead of assuming the
   * response means it is there.
   */
  const waitForMembers = async (establishmentId: string, count: number) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const members = await testSetup.prisma.dbEstablishmentMember.findMany({
        where: { establishmentId, deletedAt: null },
      });

      if (members.length >= count) {
        return members;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Establishment ${establishmentId} never reached ${count} members`);
  };

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockUser.role = 'USER';
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [
        { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
        { id: REMOVED_USER_ID, email: 'removed@establishment.com', name: 'Removed', role: 'USER', active: true },
      ],
    });
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('a member who was removed from the establishment', () => {
    const asRemoved = () =>
      testSetup.actAs({ id: REMOVED_USER_ID, email: 'removed@establishment.com', name: 'Removed' });

    const joinEstablishment = (establishmentId: string) =>
      testSetup.prisma.dbEstablishmentMember.create({
        data: { establishmentId, userId: REMOVED_USER_ID, role: DbEstablishmentRole.STAFF },
      });

    const removeFromEstablishment = (establishmentId: string, memberId: string) =>
      request(http()).delete(`/api/establishments/${establishmentId}/members/${memberId}`).expect(200);

    it('should lose access to the establishment data they could read before', async () => {
      const establishment = await testSetup.createEstablishment('Establishment');
      const member = await joinEstablishment(establishment.id);

      await request(http()).get(`/api/establishments/${establishment.id}/orders`).set(asRemoved()).expect(200);

      await removeFromEstablishment(establishment.id, member.id);

      await request(http()).get(`/api/establishments/${establishment.id}/orders`).set(asRemoved()).expect(403);
    });

    it('should stop seeing the establishment in their own list', async () => {
      const establishment = await testSetup.createEstablishment('Establishment');
      const member = await joinEstablishment(establishment.id);

      await request(http()).get('/api/establishments').set(asRemoved()).expect(200);

      await removeFromEstablishment(establishment.id, member.id);

      const response = await request(http()).get('/api/establishments').set(asRemoved()).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should get their access back when invited again', async () => {
      const establishment = await testSetup.createEstablishment('Establishment');
      const member = await joinEstablishment(establishment.id);

      await removeFromEstablishment(establishment.id, member.id);

      await request(http())
        .post(`/api/establishments/${establishment.id}/members`)
        .send({ email: 'removed@establishment.com', role: EstablishmentRole.STAFF })
        .expect(201);

      await waitForMembers(establishment.id, 2);

      await request(http()).get(`/api/establishments/${establishment.id}/orders`).set(asRemoved()).expect(200);
    });
  });

  describe('handing out the OWNER role', () => {
    it('should refuse a MANAGER inviting somebody as OWNER', async () => {
      const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.MANAGER });

      await request(http())
        .post(`/api/establishments/${establishment.id}/members`)
        .send({ email: 'newowner@establishment.com', role: EstablishmentRole.OWNER })
        .expect(403);

      const members = await testSetup.prisma.dbEstablishmentMember.findMany({
        where: { establishmentId: establishment.id },
      });
      expect(members).toHaveLength(1);
    });

    it('should let a MANAGER invite somebody as STAFF', async () => {
      const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.MANAGER });

      await request(http())
        .post(`/api/establishments/${establishment.id}/members`)
        .send({ email: 'newstaff@establishment.com', role: EstablishmentRole.STAFF })
        .expect(201);

      const members = await waitForMembers(establishment.id, 2);
      expect(members.some((member) => member.role === DbEstablishmentRole.STAFF)).toBe(true);
    });

    it('should let an OWNER invite somebody as OWNER', async () => {
      const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });

      await request(http())
        .post(`/api/establishments/${establishment.id}/members`)
        .send({ email: 'newowner@establishment.com', role: EstablishmentRole.OWNER })
        .expect(201);

      const members = await waitForMembers(establishment.id, 2);
      expect(members.some((member) => member.role === DbEstablishmentRole.OWNER && member.userId !== mockUser.id)).toBe(
        true,
      );
    });
  });
});

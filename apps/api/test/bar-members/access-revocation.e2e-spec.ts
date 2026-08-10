import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbBarRole } from '../../src/core/db';
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
  const waitForMembers = async (barId: string, count: number) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const members = await testSetup.prisma.dbBarMember.findMany({
        where: { barId, deletedAt: null },
      });

      if (members.length >= count) {
        return members;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Bar ${barId} never reached ${count} members`);
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
        { id: REMOVED_USER_ID, email: 'removed@bar.com', name: 'Removed', role: 'USER', active: true },
      ],
    });
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('a member who was removed from the bar', () => {
    const asRemoved = () => testSetup.actAs({ id: REMOVED_USER_ID, email: 'removed@bar.com', name: 'Removed' });

    const joinBar = (barId: string) =>
      testSetup.prisma.dbBarMember.create({
        data: { barId, userId: REMOVED_USER_ID, role: DbBarRole.STAFF },
      });

    const removeFromBar = (barId: string, memberId: string) =>
      request(http()).delete(`/api/bars/${barId}/members/${memberId}`).expect(200);

    it('should lose access to the bar data they could read before', async () => {
      const bar = await testSetup.createBar('Bar');
      const member = await joinBar(bar.id);

      await request(http()).get(`/api/bars/${bar.id}/orders`).set(asRemoved()).expect(200);

      await removeFromBar(bar.id, member.id);

      await request(http()).get(`/api/bars/${bar.id}/orders`).set(asRemoved()).expect(403);
    });

    it('should stop seeing the bar in their own list', async () => {
      const bar = await testSetup.createBar('Bar');
      const member = await joinBar(bar.id);

      await request(http()).get('/api/bars').set(asRemoved()).expect(200);

      await removeFromBar(bar.id, member.id);

      const response = await request(http()).get('/api/bars').set(asRemoved()).expect(200);

      expect(response.body).toEqual([]);
    });

    it('should get their access back when invited again', async () => {
      const bar = await testSetup.createBar('Bar');
      const member = await joinBar(bar.id);

      await removeFromBar(bar.id, member.id);

      await request(http())
        .post(`/api/bars/${bar.id}/members`)
        .send({ email: 'removed@bar.com', role: BarRole.STAFF })
        .expect(201);

      await waitForMembers(bar.id, 2);

      await request(http()).get(`/api/bars/${bar.id}/orders`).set(asRemoved()).expect(200);
    });
  });

  describe('handing out the OWNER role', () => {
    it('should refuse a MANAGER inviting somebody as OWNER', async () => {
      const bar = await testSetup.createBar('Bar', { role: DbBarRole.MANAGER });

      await request(http())
        .post(`/api/bars/${bar.id}/members`)
        .send({ email: 'newowner@bar.com', role: BarRole.OWNER })
        .expect(403);

      const members = await testSetup.prisma.dbBarMember.findMany({ where: { barId: bar.id } });
      expect(members).toHaveLength(1);
    });

    it('should let a MANAGER invite somebody as STAFF', async () => {
      const bar = await testSetup.createBar('Bar', { role: DbBarRole.MANAGER });

      await request(http())
        .post(`/api/bars/${bar.id}/members`)
        .send({ email: 'newstaff@bar.com', role: BarRole.STAFF })
        .expect(201);

      const members = await waitForMembers(bar.id, 2);
      expect(members.some((member) => member.role === DbBarRole.STAFF)).toBe(true);
    });

    it('should let an OWNER invite somebody as OWNER', async () => {
      const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });

      await request(http())
        .post(`/api/bars/${bar.id}/members`)
        .send({ email: 'newowner@bar.com', role: BarRole.OWNER })
        .expect(201);

      const members = await waitForMembers(bar.id, 2);
      expect(members.some((member) => member.role === DbBarRole.OWNER && member.userId !== mockUser.id)).toBe(true);
    });
  });
});

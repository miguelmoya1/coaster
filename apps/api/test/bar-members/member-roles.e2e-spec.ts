import { BarRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbBarRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const OTHER_USER_ID = '00000000-0000-4000-8000-0000000000a1';

describe('Member roles (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  const addMember = async (barId: string, role: DbBarRole) => {
    const member = await testSetup.prisma.dbBarMember.create({
      data: { barId, userId: OTHER_USER_ID, role },
    });
    return member.id;
  };

  const myMembership = (barId: string) =>
    testSetup.prisma.dbBarMember.findFirst({ where: { barId, userId: mockUser.id } });

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockUser.role = 'USER';
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [
        { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
        { id: OTHER_USER_ID, email: 'other@bar.com', name: 'Other', role: 'USER', active: true },
      ],
    });
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  it('should let an OWNER promote a member to MANAGER', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });
    const memberId = await addMember(bar.id, DbBarRole.STAFF);

    await request(http())
      .patch(`/api/bars/${bar.id}/members/${memberId}`)
      .send({ role: BarRole.MANAGER })
      .expect(200);

    const updated = await testSetup.prisma.dbBarMember.findUnique({ where: { id: memberId } });
    expect(updated?.role).toBe(DbBarRole.MANAGER);
  });

  it('should refuse a MANAGER changing anybody role', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.MANAGER });
    const memberId = await addMember(bar.id, DbBarRole.STAFF);

    await request(http())
      .patch(`/api/bars/${bar.id}/members/${memberId}`)
      .send({ role: BarRole.MANAGER })
      .expect(403);
  });

  it('should refuse a STAFF changing anybody role', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.STAFF });
    const memberId = await addMember(bar.id, DbBarRole.STAFF);

    await request(http())
      .patch(`/api/bars/${bar.id}/members/${memberId}`)
      .send({ role: BarRole.OWNER })
      .expect(403);
  });

  it('should refuse leaving the bar without an owner', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });
    const mine = await myMembership(bar.id);

    await request(http())
      .patch(`/api/bars/${bar.id}/members/${mine!.id}`)
      .send({ role: BarRole.STAFF })
      .expect(400);
  });

  it('should let an owner step down once there is a second owner', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });
    await addMember(bar.id, DbBarRole.OWNER);
    const mine = await myMembership(bar.id);

    await request(http())
      .patch(`/api/bars/${bar.id}/members/${mine!.id}`)
      .send({ role: BarRole.STAFF })
      .expect(200);
  });

  it('should reject a role that is not a bar role', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });
    const memberId = await addMember(bar.id, DbBarRole.STAFF);

    await request(http()).patch(`/api/bars/${bar.id}/members/${memberId}`).send({ role: 'ADMIN' }).expect(400);
  });

  it('should accept MANAGER when inviting, which the old DTO rejected', async () => {
    const bar = await testSetup.createBar('Bar', { role: DbBarRole.OWNER });

    await request(http())
      .post(`/api/bars/${bar.id}/members`)
      .send({ email: 'newcomer@bar.com', role: BarRole.MANAGER })
      .expect(201);
  });
});

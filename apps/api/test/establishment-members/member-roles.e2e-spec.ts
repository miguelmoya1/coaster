import { EstablishmentRole } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const OTHER_USER_ID = '00000000-0000-4000-8000-0000000000a1';

describe('Member roles (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  const addMember = async (establishmentId: string, role: DbEstablishmentRole) => {
    const member = await testSetup.prisma.dbEstablishmentMember.create({
      data: { establishmentId, userId: OTHER_USER_ID, role },
    });
    return member.id;
  };

  const myMembership = (establishmentId: string) =>
    testSetup.prisma.dbEstablishmentMember.findFirst({ where: { establishmentId, userId: mockUser.id } });

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockUser.role = 'USER';
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.createMany({
      data: [
        { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
        { id: OTHER_USER_ID, email: 'other@establishment.com', name: 'Other', role: 'USER', active: true },
      ],
    });
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  it('should let an OWNER promote a member to MANAGER', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });
    const memberId = await addMember(establishment.id, DbEstablishmentRole.STAFF);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${memberId}`)
      .send({ role: EstablishmentRole.MANAGER })
      .expect(200);

    const updated = await testSetup.prisma.dbEstablishmentMember.findUnique({ where: { id: memberId } });
    expect(updated?.role).toBe(DbEstablishmentRole.MANAGER);
  });

  it('should refuse a MANAGER changing anybody role', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.MANAGER });
    const memberId = await addMember(establishment.id, DbEstablishmentRole.STAFF);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${memberId}`)
      .send({ role: EstablishmentRole.MANAGER })
      .expect(403);
  });

  it('should refuse a STAFF changing anybody role', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.STAFF });
    const memberId = await addMember(establishment.id, DbEstablishmentRole.STAFF);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${memberId}`)
      .send({ role: EstablishmentRole.OWNER })
      .expect(403);
  });

  it('should refuse leaving the establishment without an owner', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });
    const mine = await myMembership(establishment.id);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${mine!.id}`)
      .send({ role: EstablishmentRole.STAFF })
      .expect(400);
  });

  it('should let an owner step down once there is a second owner', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });
    await addMember(establishment.id, DbEstablishmentRole.OWNER);
    const mine = await myMembership(establishment.id);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${mine!.id}`)
      .send({ role: EstablishmentRole.STAFF })
      .expect(200);
  });

  it('should reject a role that is not an establishment role', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });
    const memberId = await addMember(establishment.id, DbEstablishmentRole.STAFF);

    await request(http())
      .patch(`/api/establishments/${establishment.id}/members/${memberId}`)
      .send({ role: 'ADMIN' })
      .expect(400);
  });

  it('should accept MANAGER when inviting, which the old DTO rejected', async () => {
    const establishment = await testSetup.createEstablishment('Establishment', { role: DbEstablishmentRole.OWNER });

    await request(http())
      .post(`/api/establishments/${establishment.id}/members`)
      .send({ email: 'newcomer@establishment.com', role: EstablishmentRole.MANAGER })
      .expect(201);
  });
});

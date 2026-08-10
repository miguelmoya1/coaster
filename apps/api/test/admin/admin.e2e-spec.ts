import { EstablishmentRole, SubscriptionPlan } from '@coaster/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DbEstablishmentRole, DbSubscriptionStatus } from '../../src/core/db';
import { E2eTestSetup, mockUser } from '../utils/e2e-setup';

const OTHER_USER_ID = '00000000-0000-4000-8000-00000000000f';

describe('Admin backoffice (e2e)', () => {
  const testSetup = new E2eTestSetup();
  const http = () => testSetup.app.getHttpServer();

  const becomeAdmin = async () => {
    await testSetup.prisma.dbUser.update({ where: { id: mockUser.id }, data: { role: 'ADMIN' } });
    mockUser.role = 'ADMIN';
  };

  const waitForAudit = async (): Promise<number> => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const count = await testSetup.prisma.dbAdminAuditLog.count();
      if (count > 0) return count;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return 0;
  };

  beforeAll(async () => {
    await testSetup.setup();
  });

  beforeEach(async () => {
    mockUser.role = 'USER';
    await testSetup.clearDatabase();

    await testSetup.prisma.dbUser.create({
      data: { id: mockUser.id, email: mockUser.email, name: mockUser.name, role: 'USER', active: true },
    });
  });

  afterAll(async () => {
    mockUser.role = 'USER';
    await testSetup.teardown();
  });

  describe('access control', () => {
    const routes = ['/api/admin/overview', '/api/admin/audit', '/api/admin/establishments', '/api/admin/users'];

    it('should refuse every admin route to a plain user', async () => {
      for (const route of routes) {
        await request(http()).get(route).expect(403);
      }
    });

    it('should open every admin route once the user is an ADMIN', async () => {
      await becomeAdmin();

      for (const route of routes) {
        await request(http()).get(route).expect(200);
      }
    });

    it('should refuse a plain user the write routes too', async () => {
      const establishment = await testSetup.createEstablishment('Someone elses establishment', { ownerId: null });

      await request(http())
        .post(`/api/admin/establishments/${establishment.id}/plan`)
        .send({ plan: SubscriptionPlan.PRO })
        .expect(403);

      await request(http())
        .patch(`/api/admin/establishments/${establishment.id}`)
        .send({ name: 'Hijacked' })
        .expect(403);
    });
  });

  describe('manual PRO grant', () => {
    const lapse = (establishmentId: string) =>
      testSetup.prisma.dbEstablishmentSubscription.update({
        where: { establishmentId },
        data: { status: DbSubscriptionStatus.INACTIVE, trialEndsAt: new Date(Date.now() - 1000) },
      });

    it('should let a lapsed establishment write again, and stop it once revoked', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('Lapsed establishment');
      await lapse(establishment.id);

      await request(http()).post(`/api/establishments/${establishment.id}/tables`).send({ name: 'T1' }).expect(402);

      await request(http())
        .post(`/api/admin/establishments/${establishment.id}/plan`)
        .send({ plan: SubscriptionPlan.PRO, durationDays: 30, reason: 'Compensation' })
        .expect(201);

      await request(http()).post(`/api/establishments/${establishment.id}/tables`).send({ name: 'T2' }).expect(201);

      await request(http()).post(`/api/admin/establishments/${establishment.id}/plan/revoke`).send({}).expect(201);

      await request(http()).post(`/api/establishments/${establishment.id}/tables`).send({ name: 'T3' }).expect(402);
    });

    it('should keep the Stripe columns untouched when granting', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('Stripe establishment');
      await testSetup.prisma.dbEstablishmentSubscription.update({
        where: { establishmentId: establishment.id },
        data: { stripeCustomerId: 'cus_keep', stripeSubscriptionId: 'sub_keep' },
      });

      await request(http())
        .post(`/api/admin/establishments/${establishment.id}/plan`)
        .send({ plan: SubscriptionPlan.PRO })
        .expect(201);

      const billing = await testSetup.prisma.dbEstablishmentSubscription.findUnique({
        where: { establishmentId: establishment.id },
      });

      expect(billing?.stripeCustomerId).toBe('cus_keep');
      expect(billing?.stripeSubscriptionId).toBe('sub_keep');
      expect(billing?.manualPlan).toBe(SubscriptionPlan.PRO);
      expect(billing?.manualGrantExpiresAt).toBeNull();
    });

    it('should refuse to revoke a grant that is not there', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('No grant');

      await request(http()).post(`/api/admin/establishments/${establishment.id}/plan/revoke`).send({}).expect(400);
    });

    it('should not expose the admin note to the members of the establishment', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('Granted establishment');

      await request(http())
        .post(`/api/admin/establishments/${establishment.id}/plan`)
        .send({ plan: SubscriptionPlan.PRO, reason: 'Friend of the founder' })
        .expect(201);

      const workspace = await request(http())
        .get(`/api/establishments/${establishment.id}/establishment-subscription`)
        .expect(200);

      expect(JSON.stringify(workspace.body)).not.toContain('Friend of the founder');
      expect(workspace.body.manualGrant).toEqual({ plan: SubscriptionPlan.PRO, expiresAt: null });

      const backoffice = await request(http()).get(`/api/admin/establishments/${establishment.id}`).expect(200);

      expect(backoffice.body.subscription.manualGrant.reason).toBe('Friend of the founder');
    });
  });

  describe('admin reach into any establishment', () => {
    it('should let an admin act on an establishment it does not belong to', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('Foreign establishment', { ownerId: null });

      const me = await request(http()).get(`/api/establishments/${establishment.id}/members/me`).expect(200);
      expect(me.body.role).toBe(DbEstablishmentRole.OWNER);

      await request(http()).post(`/api/establishments/${establishment.id}/tables`).send({ name: 'T1' }).expect(201);
    });

    it('should audit a role change an admin makes through the ordinary member route', async () => {
      await becomeAdmin();
      const establishment = await testSetup.createEstablishment('Foreign establishment', { ownerId: null });
      await testSetup.prisma.dbUser.create({
        data: { id: OTHER_USER_ID, email: 'other@establishment.com', name: 'Other', role: 'USER', active: true },
      });
      const member = await testSetup.prisma.dbEstablishmentMember.create({
        data: { establishmentId: establishment.id, userId: OTHER_USER_ID, role: DbEstablishmentRole.STAFF },
      });

      await request(http())
        .patch(`/api/establishments/${establishment.id}/members/${member.id}`)
        .send({ role: EstablishmentRole.MANAGER })
        .expect(200);

      expect(await waitForAudit()).toBe(1);

      const audit = await request(http()).get('/api/admin/audit').expect(200);

      expect(audit.body.items[0]).toMatchObject({
        action: 'ESTABLISHMENT_MEMBER_ROLE_CHANGED',
        targetType: 'ESTABLISHMENT',
        targetId: establishment.id,
      });
    });

    it('should not audit a role change made by an ordinary owner', async () => {
      const establishment = await testSetup.createEstablishment('My establishment');
      await testSetup.prisma.dbUser.create({
        data: { id: OTHER_USER_ID, email: 'other@establishment.com', name: 'Other', role: 'USER', active: true },
      });
      const member = await testSetup.prisma.dbEstablishmentMember.create({
        data: { establishmentId: establishment.id, userId: OTHER_USER_ID, role: DbEstablishmentRole.STAFF },
      });

      await request(http())
        .patch(`/api/establishments/${establishment.id}/members/${member.id}`)
        .send({ role: EstablishmentRole.MANAGER })
        .expect(200);

      expect(await waitForAudit()).toBe(0);
    });
  });

  describe('user administration', () => {
    it('should record an audit entry for every change', async () => {
      await becomeAdmin();
      await testSetup.prisma.dbUser.create({
        data: { id: OTHER_USER_ID, email: 'other@establishment.com', name: 'Other', role: 'USER', active: true },
      });

      await request(http()).patch(`/api/admin/users/${OTHER_USER_ID}`).send({ role: 'ADMIN' }).expect(200);

      const audit = await request(http()).get('/api/admin/audit').expect(200);

      expect(audit.body.items[0]).toMatchObject({
        action: 'USER_ROLE_CHANGED',
        targetType: 'USER',
        targetId: OTHER_USER_ID,
      });
    });

    it('should refuse an admin editing their own account', async () => {
      await becomeAdmin();

      await request(http()).patch(`/api/admin/users/${mockUser.id}`).send({ active: false }).expect(400);
    });

    it('should refuse demoting the last admin', async () => {
      await becomeAdmin();
      await testSetup.prisma.dbUser.create({
        data: { id: OTHER_USER_ID, email: 'other@establishment.com', name: 'Other', role: 'ADMIN', active: true },
      });
      await testSetup.prisma.dbUser.update({ where: { id: mockUser.id }, data: { role: 'ADMIN' } });
      await testSetup.prisma.dbUser.update({ where: { id: mockUser.id }, data: { active: false } });

      await request(http()).patch(`/api/admin/users/${OTHER_USER_ID}`).send({ role: 'USER' }).expect(400);
    });
  });
});

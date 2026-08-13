import { SubscriptionOverriddenEvent } from '@coaster/establishment-subscription';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminAuditAction, ErrorCodes, SubscriptionPlan, asEstablishmentId, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevokeEstablishmentPlanCommand } from '../impl/revoke-establishment-plan.command';
import { RevokeEstablishmentPlanHandler } from './revoke-establishment-plan.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

const grantedEstablishment = {
  id: 'establishment-1',
  name: 'El Establishment',
  billing: {
    manualPlan: SubscriptionPlan.PRO,
    manualGrantExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
  },
};

describe('RevokeEstablishmentPlanHandler', () => {
  let handler: RevokeEstablishmentPlanHandler;
  let readRepo: { findEstablishmentById: ReturnType<typeof vi.fn> };
  let writeRepo: { revokePlan: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  const published = <T>(type: new (...args: never[]) => T): T | undefined =>
    eventBus.publish.mock.calls.map(([event]) => event).find((event) => event instanceof type);

  beforeEach(() => {
    readRepo = { findEstablishmentById: vi.fn().mockResolvedValue(grantedEstablishment) };
    writeRepo = { revokePlan: vi.fn().mockResolvedValue(undefined) };
    eventBus = { publish: vi.fn() };

    handler = new RevokeEstablishmentPlanHandler(readRepo as any, writeRepo as any, eventBus as any);
  });

  it('should clear the grant, record what was removed and notify the establishment', async () => {
    await handler.execute(
      new RevokeEstablishmentPlanCommand(asEstablishmentId('establishment-1'), { reason: 'Trial over' }, actor),
    );

    expect(writeRepo.revokePlan).toHaveBeenCalledWith('establishment-1');
    expect(published(AdminActionEvent)?.entry).toMatchObject(
      expect.objectContaining({
        action: AdminAuditAction.ESTABLISHMENT_PLAN_REVOKED,
        reason: 'Trial over',
        metadata: { plan: SubscriptionPlan.PRO, expiresAt: '2026-04-01T00:00:00.000Z' },
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SubscriptionOverriddenEvent));
  });

  it('should refuse when the establishment has no grant to take away', async () => {
    readRepo.findEstablishmentById.mockResolvedValue({
      id: 'establishment-1',
      name: 'El Establishment',
      billing: { manualPlan: null },
    });

    await expect(
      handler.execute(new RevokeEstablishmentPlanCommand(asEstablishmentId('establishment-1'), {}, actor)),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.NO_MANUAL_GRANT));

    expect(writeRepo.revokePlan).not.toHaveBeenCalled();
  });

  it('should reject an establishment that does not exist', async () => {
    readRepo.findEstablishmentById.mockResolvedValue(null);

    await expect(
      handler.execute(new RevokeEstablishmentPlanCommand(asEstablishmentId('missing'), {}, actor)),
    ).rejects.toThrow(NotFoundException);
  });
});

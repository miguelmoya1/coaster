import { SubscriptionOverriddenEvent } from '@coaster/bar-subscription';
import { AdminAuditAction, ErrorCodes, SubscriptionPlan, asBarId, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevokeBarPlanCommand } from '../impl/revoke-bar-plan.command';
import { RevokeBarPlanHandler } from './revoke-bar-plan.handler';

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

const grantedBar = {
  id: 'bar-1',
  name: 'El Bar',
  billing: {
    manualPlan: SubscriptionPlan.PRO,
    manualGrantExpiresAt: new Date('2026-04-01T00:00:00.000Z'),
  },
};

describe('RevokeBarPlanHandler', () => {
  let handler: RevokeBarPlanHandler;
  let readRepo: { findBarById: ReturnType<typeof vi.fn> };
  let writeRepo: { revokePlan: ReturnType<typeof vi.fn> };
  let auditRepo: { record: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    readRepo = { findBarById: vi.fn().mockResolvedValue(grantedBar) };
    writeRepo = { revokePlan: vi.fn().mockResolvedValue(undefined) };
    auditRepo = { record: vi.fn().mockResolvedValue(undefined) };
    eventBus = { publish: vi.fn() };

    handler = new RevokeBarPlanHandler(readRepo as any, writeRepo as any, auditRepo as any, eventBus as any);
  });

  it('should clear the grant, record what was removed and notify the bar', async () => {
    await handler.execute(new RevokeBarPlanCommand(asBarId('bar-1'), { reason: 'Trial over' }, actor));

    expect(writeRepo.revokePlan).toHaveBeenCalledWith('bar-1');
    expect(auditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.BAR_PLAN_REVOKED,
        reason: 'Trial over',
        metadata: { plan: SubscriptionPlan.PRO, expiresAt: '2026-04-01T00:00:00.000Z' },
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SubscriptionOverriddenEvent));
  });

  it('should refuse when the bar has no grant to take away', async () => {
    readRepo.findBarById.mockResolvedValue({ id: 'bar-1', name: 'El Bar', billing: { manualPlan: null } });

    await expect(handler.execute(new RevokeBarPlanCommand(asBarId('bar-1'), {}, actor))).rejects.toThrow(
      new BadRequestException(ErrorCodes.NO_MANUAL_GRANT),
    );

    expect(writeRepo.revokePlan).not.toHaveBeenCalled();
  });

  it('should reject a bar that does not exist', async () => {
    readRepo.findBarById.mockResolvedValue(null);

    await expect(handler.execute(new RevokeBarPlanCommand(asBarId('missing'), {}, actor))).rejects.toThrow(
      NotFoundException,
    );
  });
});

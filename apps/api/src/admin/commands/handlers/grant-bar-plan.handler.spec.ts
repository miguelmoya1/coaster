import { SubscriptionOverriddenEvent } from '@coaster/bar-subscription';
import { AdminAuditAction, AdminAuditTargetType, SubscriptionPlan, asBarId, asUserId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrantBarPlanCommand } from '../impl/grant-bar-plan.command';
import { GrantBarPlanHandler } from './grant-bar-plan.handler';

const NOW = new Date('2026-03-01T00:00:00.000Z');

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

describe('GrantBarPlanHandler', () => {
  let handler: GrantBarPlanHandler;
  let readRepo: { findBarById: ReturnType<typeof vi.fn> };
  let writeRepo: { grantPlan: ReturnType<typeof vi.fn> };
  let auditRepo: { record: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    readRepo = { findBarById: vi.fn().mockResolvedValue({ id: 'bar-1', name: 'El Bar' }) };
    writeRepo = { grantPlan: vi.fn().mockResolvedValue(undefined) };
    auditRepo = { record: vi.fn().mockResolvedValue(undefined) };
    eventBus = { publish: vi.fn() };

    handler = new GrantBarPlanHandler(readRepo as any, writeRepo as any, auditRepo as any, eventBus as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should turn a duration in days into an expiry date', async () => {
    await handler.execute(
      new GrantBarPlanCommand(asBarId('bar-1'), { plan: SubscriptionPlan.PRO, durationDays: 30 }, actor),
    );

    expect(writeRepo.grantPlan).toHaveBeenCalledWith('bar-1', {
      plan: SubscriptionPlan.PRO,
      expiresAt: new Date('2026-03-31T00:00:00.000Z'),
      reason: null,
      grantedById: 'admin-1',
    });
  });

  it('should grant open-endedly when no duration is given', async () => {
    await handler.execute(new GrantBarPlanCommand(asBarId('bar-1'), { plan: SubscriptionPlan.PRO }, actor));

    expect(writeRepo.grantPlan).toHaveBeenCalledWith(
      'bar-1',
      expect.objectContaining({ expiresAt: null, reason: null }),
    );
  });

  it('should record the grant and tell the bar its access changed', async () => {
    await handler.execute(
      new GrantBarPlanCommand(
        asBarId('bar-1'),
        { plan: SubscriptionPlan.PRO, durationDays: 7, reason: '  Beta tester  ' },
        actor,
      ),
    );

    expect(auditRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: AdminAuditAction.BAR_PLAN_GRANTED,
        targetType: AdminAuditTargetType.BAR,
        targetId: 'bar-1',
        targetLabel: 'El Bar',
        reason: 'Beta tester',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SubscriptionOverriddenEvent));
  });

  it('should reject a bar that does not exist without writing anything', async () => {
    readRepo.findBarById.mockResolvedValue(null);

    await expect(
      handler.execute(new GrantBarPlanCommand(asBarId('missing'), { plan: SubscriptionPlan.PRO }, actor)),
    ).rejects.toThrow(NotFoundException);

    expect(writeRepo.grantPlan).not.toHaveBeenCalled();
    expect(auditRepo.record).not.toHaveBeenCalled();
  });
});

import { SubscriptionOverriddenEvent } from '@coaster/establishment-subscription';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminAuditAction, AdminAuditTargetType, SubscriptionPlan, asEstablishmentId, asUserId } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GrantEstablishmentPlanCommand } from '../impl/grant-establishment-plan.command';
import { GrantEstablishmentPlanHandler } from './grant-establishment-plan.handler';

const NOW = new Date('2026-03-01T00:00:00.000Z');

const actor = {
  id: asUserId('admin-1'),
  name: 'Admin',
  email: 'admin@coaster.app',
  active: true,
  role: 'ADMIN',
  language: 'es',
} as any;

describe('GrantEstablishmentPlanHandler', () => {
  let handler: GrantEstablishmentPlanHandler;
  let readRepo: { findEstablishmentById: ReturnType<typeof vi.fn> };
  let writeRepo: { grantPlan: ReturnType<typeof vi.fn> };
  let eventBus: { publish: ReturnType<typeof vi.fn> };

  const published = <T>(type: new (...args: never[]) => T): T | undefined =>
    eventBus.publish.mock.calls.map(([event]) => event).find((event) => event instanceof type);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    readRepo = {
      findEstablishmentById: vi.fn().mockResolvedValue({ id: 'establishment-1', name: 'El Establishment' }),
    };
    writeRepo = { grantPlan: vi.fn().mockResolvedValue(undefined) };
    eventBus = { publish: vi.fn() };

    handler = new GrantEstablishmentPlanHandler(readRepo as any, writeRepo as any, eventBus as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should turn a duration in days into an expiry date', async () => {
    await handler.execute(
      new GrantEstablishmentPlanCommand(
        asEstablishmentId('establishment-1'),
        { plan: SubscriptionPlan.PRO, durationDays: 30 },
        actor,
      ),
    );

    expect(writeRepo.grantPlan).toHaveBeenCalledWith('establishment-1', {
      plan: SubscriptionPlan.PRO,
      expiresAt: new Date('2026-03-31T00:00:00.000Z'),
      reason: null,
      grantedById: 'admin-1',
    });
  });

  it('should grant open-endedly when no duration is given', async () => {
    await handler.execute(
      new GrantEstablishmentPlanCommand(asEstablishmentId('establishment-1'), { plan: SubscriptionPlan.PRO }, actor),
    );

    expect(writeRepo.grantPlan).toHaveBeenCalledWith(
      'establishment-1',
      expect.objectContaining({ expiresAt: null, reason: null }),
    );
  });

  it('should record the grant and tell the establishment its access changed', async () => {
    await handler.execute(
      new GrantEstablishmentPlanCommand(
        asEstablishmentId('establishment-1'),
        { plan: SubscriptionPlan.PRO, durationDays: 7, reason: '  Beta tester  ' },
        actor,
      ),
    );

    expect(published(AdminActionEvent)?.entry).toMatchObject(
      expect.objectContaining({
        actorId: 'admin-1',
        action: AdminAuditAction.ESTABLISHMENT_PLAN_GRANTED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: 'establishment-1',
        targetLabel: 'El Establishment',
        reason: 'Beta tester',
      }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(expect.any(SubscriptionOverriddenEvent));
  });

  it('should reject an establishment that does not exist without writing anything', async () => {
    readRepo.findEstablishmentById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GrantEstablishmentPlanCommand(asEstablishmentId('missing'), { plan: SubscriptionPlan.PRO }, actor),
      ),
    ).rejects.toThrow(NotFoundException);

    expect(writeRepo.grantPlan).not.toHaveBeenCalled();
    expect(published(AdminActionEvent)).toBeUndefined();
  });
});

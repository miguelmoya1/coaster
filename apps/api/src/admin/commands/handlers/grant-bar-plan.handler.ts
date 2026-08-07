import { SubscriptionOverriddenEvent } from '@coaster/bar-subscription';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import type { DbSubscriptionPlan } from '@coaster/core/db';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { daysFromNow } from '../../utils/pagination';
import { GrantBarPlanCommand } from '../impl/grant-bar-plan.command';

@CommandHandler(GrantBarPlanCommand)
export class GrantBarPlanHandler implements ICommandHandler<GrantBarPlanCommand, void> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _auditRepo: AdminAuditRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: GrantBarPlanCommand): Promise<void> {
    const { barId, dto, actor } = command;
    const bar = await this._readRepo.findBarById(barId);

    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    const expiresAt = dto.durationDays ? daysFromNow(dto.durationDays) : null;

    await this._writeRepo.grantPlan(barId, {
      plan: dto.plan as DbSubscriptionPlan,
      expiresAt,
      reason: dto.reason?.trim() || null,
      grantedById: actor.id,
    });

    await this._auditRepo.record({
      actorId: actor.id,
      action: AdminAuditAction.BAR_PLAN_GRANTED,
      targetType: AdminAuditTargetType.BAR,
      targetId: barId,
      targetLabel: bar.name,
      reason: dto.reason?.trim() || null,
      metadata: {
        plan: dto.plan,
        durationDays: dto.durationDays ?? null,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    this._eventBus.publish(new SubscriptionOverriddenEvent(barId));
  }
}

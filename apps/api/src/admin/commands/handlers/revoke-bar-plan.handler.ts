import { SubscriptionOverriddenEvent } from '@coaster/bar-subscription';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { RevokeBarPlanCommand } from '../impl/revoke-bar-plan.command';

@CommandHandler(RevokeBarPlanCommand)
export class RevokeBarPlanHandler implements ICommandHandler<RevokeBarPlanCommand, void> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RevokeBarPlanCommand): Promise<void> {
    const { barId, dto, actor } = command;
    const bar = await this._readRepo.findBarById(barId);

    if (!bar) {
      throw new NotFoundException(ErrorCodes.BAR_NOT_FOUND);
    }

    if (!bar.billing?.manualPlan) {
      throw new BadRequestException(ErrorCodes.NO_MANUAL_GRANT);
    }

    const revoked = {
      plan: bar.billing.manualPlan,
      expiresAt: bar.billing.manualGrantExpiresAt?.toISOString() ?? null,
    };

    await this._writeRepo.revokePlan(barId);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.BAR_PLAN_REVOKED,
        targetType: AdminAuditTargetType.BAR,
        targetId: barId,
        targetLabel: bar.name,
        reason: dto.reason?.trim() || null,
        metadata: revoked,
      }),
    );

    this._eventBus.publish(new SubscriptionOverriddenEvent(barId));
  }
}

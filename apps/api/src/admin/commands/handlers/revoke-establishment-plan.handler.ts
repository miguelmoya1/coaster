import { SubscriptionOverriddenEvent } from '@coaster/establishment-subscription';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { RevokeEstablishmentPlanCommand } from '../impl/revoke-establishment-plan.command';

@CommandHandler(RevokeEstablishmentPlanCommand)
export class RevokeEstablishmentPlanHandler implements ICommandHandler<RevokeEstablishmentPlanCommand, void> {
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RevokeEstablishmentPlanCommand): Promise<void> {
    const { establishmentId, dto, actor } = command;
    const establishment = await this._readRepo.findEstablishmentById(establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    if (!establishment.billing?.manualPlan) {
      throw new BadRequestException(ErrorCodes.NO_MANUAL_GRANT);
    }

    const revoked = {
      plan: establishment.billing.manualPlan,
      expiresAt: establishment.billing.manualGrantExpiresAt?.toISOString() ?? null,
    };

    await this._writeRepo.revokePlan(establishmentId);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.ESTABLISHMENT_PLAN_REVOKED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: establishmentId,
        targetLabel: establishment.name,
        reason: dto.reason?.trim() || null,
        metadata: revoked,
      }),
    );

    this._eventBus.publish(new SubscriptionOverriddenEvent(establishmentId));
  }
}

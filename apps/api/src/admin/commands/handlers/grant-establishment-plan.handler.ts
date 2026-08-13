import { SubscriptionOverriddenEvent } from '@coaster/establishment-subscription';
import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import type { DbSubscriptionPlan } from '@coaster/core/db';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminWriteRepository } from '../../data-access/admin.write.repository';
import { daysFromNow } from '../../utils/pagination';
import { GrantEstablishmentPlanCommand } from '../impl/grant-establishment-plan.command';

@CommandHandler(GrantEstablishmentPlanCommand)
export class GrantEstablishmentPlanHandler implements ICommandHandler<GrantEstablishmentPlanCommand, void> {
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _writeRepo: AdminWriteRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: GrantEstablishmentPlanCommand): Promise<void> {
    const { establishmentId, dto, actor } = command;
    const establishment = await this._readRepo.findEstablishmentById(establishmentId);

    if (!establishment) {
      throw new NotFoundException(ErrorCodes.ESTABLISHMENT_NOT_FOUND);
    }

    const expiresAt = dto.durationDays ? daysFromNow(dto.durationDays) : null;

    await this._writeRepo.grantPlan(establishmentId, {
      plan: dto.plan as DbSubscriptionPlan,
      expiresAt,
      reason: dto.reason?.trim() || null,
      grantedById: actor.id,
    });

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.ESTABLISHMENT_PLAN_GRANTED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: establishmentId,
        targetLabel: establishment.name,
        reason: dto.reason?.trim() || null,
        metadata: {
          plan: dto.plan,
          durationDays: dto.durationDays ?? null,
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      }),
    );

    this._eventBus.publish(new SubscriptionOverriddenEvent(establishmentId));
  }
}

import { MemberRoleChangedEvent } from '@coaster/bar-members';
import { AdminAuditAction, AdminAuditTargetType, Role } from '@coaster/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';
import { AdminActionEvent } from '../impl/admin-action.event';

@EventsHandler(MemberRoleChangedEvent)
export class AuditMemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async handle(event: MemberRoleChangedEvent): Promise<void> {
    if (event.actorRole !== Role.ADMIN) {
      return;
    }

    const bar = await this._readRepo.findBarById(event.barId);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: event.actorId,
        action: AdminAuditAction.BAR_MEMBER_ROLE_CHANGED,
        targetType: AdminAuditTargetType.BAR,
        targetId: event.barId,
        targetLabel: bar?.name ?? null,
        metadata: {
          memberId: event.memberId,
          userId: event.userId,
          from: event.from,
          to: event.to,
        },
      }),
    );
  }
}

import { MemberRoleChangedEvent } from '@coaster/establishment-members';
import { AdminAuditAction, AdminAuditTargetType, Role } from '@coaster/common';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdminEstablishmentReadRepository } from '../../data-access/admin-establishment.read.repository';
import { AdminActionEvent } from '../impl/admin-action.event';

@EventsHandler(MemberRoleChangedEvent)
export class AuditMemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  constructor(
    private readonly _readRepo: AdminEstablishmentReadRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async handle(event: MemberRoleChangedEvent): Promise<void> {
    if (event.actorRole !== Role.ADMIN) {
      return;
    }

    const establishment = await this._readRepo.findEstablishmentById(event.establishmentId);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: event.actorId,
        action: AdminAuditAction.ESTABLISHMENT_MEMBER_ROLE_CHANGED,
        targetType: AdminAuditTargetType.ESTABLISHMENT,
        targetId: event.establishmentId,
        targetLabel: establishment?.name ?? null,
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

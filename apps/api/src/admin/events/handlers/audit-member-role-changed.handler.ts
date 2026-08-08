import { MemberRoleChangedEvent } from '@coaster/bar-members';
import { AdminAuditAction, AdminAuditTargetType, Role } from '@coaster/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminBarReadRepository } from '../../data-access/admin-bar.read.repository';

@EventsHandler(MemberRoleChangedEvent)
export class AuditMemberRoleChangedHandler implements IEventHandler<MemberRoleChangedEvent> {
  constructor(
    private readonly _readRepo: AdminBarReadRepository,
    private readonly _auditRepo: AdminAuditRepository,
  ) {}

  async handle(event: MemberRoleChangedEvent): Promise<void> {
    if (event.actorRole !== Role.ADMIN) {
      return;
    }

    const bar = await this._readRepo.findBarById(event.barId);

    await this._auditRepo.record({
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
    });
  }
}

import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminBetaTesterRepository } from '../../data-access/admin-beta-tester.repository';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { RemoveBetaTesterCommand } from '../impl/remove-beta-tester.command';

@CommandHandler(RemoveBetaTesterCommand)
export class RemoveBetaTesterHandler implements ICommandHandler<RemoveBetaTesterCommand, void> {
  constructor(
    private readonly _repo: AdminBetaTesterRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: RemoveBetaTesterCommand): Promise<void> {
    const { betaTesterId, actor } = command;
    const tester = await this._repo.findById(betaTesterId);

    if (!tester) {
      throw new NotFoundException(ErrorCodes.BETA_TESTER_NOT_FOUND);
    }

    await this._repo.remove(betaTesterId);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.BETA_TESTER_REMOVED,
        targetType: AdminAuditTargetType.BETA_TESTER,
        targetId: betaTesterId,
        targetLabel: tester.email,
      }),
    );
  }
}

import { AdminAuditAction, AdminAuditTargetType, ErrorCodes } from '@coaster/common';
import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AdminBetaTesterRepository } from '../../data-access/admin-beta-tester.repository';
import { AdminActionEvent } from '../../events/impl/admin-action.event';
import { AddBetaTesterCommand } from '../impl/add-beta-tester.command';

@CommandHandler(AddBetaTesterCommand)
export class AddBetaTesterHandler implements ICommandHandler<AddBetaTesterCommand, void> {
  constructor(
    private readonly _repo: AdminBetaTesterRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AddBetaTesterCommand): Promise<void> {
    const { dto, actor } = command;
    const email = dto.email.trim().toLowerCase();

    if (await this._repo.findByEmail(email)) {
      throw new ConflictException(ErrorCodes.BETA_TESTER_ALREADY_EXISTS);
    }

    const tester = await this._repo.add(email, dto.note?.trim() || null, actor.id);

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: actor.id,
        action: AdminAuditAction.BETA_TESTER_ADDED,
        targetType: AdminAuditTargetType.BETA_TESTER,
        targetId: tester.id,
        targetLabel: email,
        reason: tester.note,
      }),
    );
  }
}

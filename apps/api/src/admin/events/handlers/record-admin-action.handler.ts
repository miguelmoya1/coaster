import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdminAuditRepository } from '../../data-access/admin-audit.repository';
import { AdminActionEvent } from '../impl/admin-action.event';

@EventsHandler(AdminActionEvent)
export class RecordAdminActionHandler implements IEventHandler<AdminActionEvent> {
  readonly #logger = new Logger(RecordAdminActionHandler.name);

  constructor(private readonly _auditRepo: AdminAuditRepository) {}

  async handle(event: AdminActionEvent): Promise<void> {
    const { entry } = event;

    try {
      await this._auditRepo.record(entry);
    } catch (error) {
      this.#logger.error(
        `Failed to record ${entry.action} by ${entry.actorId} on ${entry.targetType} ${entry.targetId}. ` +
          `The action itself went through and is now unaudited.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

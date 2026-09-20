import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AuthEventRepository } from '../../data-access/auth-event.repository';
import { AuthEventOccurred } from '../impl/auth-event.event';

@EventsHandler(AuthEventOccurred)
export class RecordAuthEventHandler implements IEventHandler<AuthEventOccurred> {
  readonly #logger = new Logger(RecordAuthEventHandler.name);

  constructor(private readonly _events: AuthEventRepository) {}

  async handle(event: AuthEventOccurred): Promise<void> {
    const { entry } = event;

    try {
      await this._events.record(entry);
    } catch (error) {
      this.#logger.error(
        `Failed to record ${entry.type} for ${entry.userId ?? entry.email ?? 'nobody in particular'}. ` +
          `It happened all the same and is now unlogged.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

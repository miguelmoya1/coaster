import { ShiftCreatedEvent, ShiftDeletedEvent } from '@coaster/shifts';
import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { FichitSync } from '../../services/fichit-sync.service';

@EventsHandler(ShiftCreatedEvent)
export class MirrorShiftHandler implements IEventHandler<ShiftCreatedEvent> {
  readonly #logger = new Logger(MirrorShiftHandler.name);

  constructor(private readonly sync: FichitSync) {}

  async handle(event: ShiftCreatedEvent): Promise<void> {
    try {
      await this.sync.mirrorShift(event.shift.id);
    } catch (error) {
      this.#logger.error(`Could not mirror shift ${event.shift.id} into Fichit`, error);
    }
  }
}

@EventsHandler(ShiftDeletedEvent)
export class RemoveMirroredShiftHandler implements IEventHandler<ShiftDeletedEvent> {
  readonly #logger = new Logger(RemoveMirroredShiftHandler.name);

  constructor(private readonly sync: FichitSync) {}

  async handle(event: ShiftDeletedEvent): Promise<void> {
    try {
      await this.sync.removeMirroredShift(event.establishmentId, event.shiftId);
    } catch (error) {
      this.#logger.error(`Could not remove mirrored shift ${event.shiftId} from Fichit`, error);
    }
  }
}

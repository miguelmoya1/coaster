import { AdminAuditAction, AdminAuditTargetType, Role, TimeEntrySource } from '@coaster/common';
import { TimeEntryAmendedEvent, TimeEntryRecordedEvent, TimeEntryVoidedEvent } from '@coaster/time-tracking';
import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AdminActionEvent } from '../impl/admin-action.event';

type TimeEntryEvent = TimeEntryRecordedEvent | TimeEntryAmendedEvent | TimeEntryVoidedEvent;

const actionOf = (event: TimeEntryEvent): AdminAuditAction => {
  if (event instanceof TimeEntryAmendedEvent) {
    return AdminAuditAction.TIME_ENTRY_AMENDED;
  }

  return event instanceof TimeEntryVoidedEvent
    ? AdminAuditAction.TIME_ENTRY_VOIDED
    : AdminAuditAction.TIME_ENTRY_CREATED;
};

@EventsHandler(TimeEntryRecordedEvent, TimeEntryAmendedEvent, TimeEntryVoidedEvent)
export class AuditTimeEntryChangedHandler implements IEventHandler<TimeEntryEvent> {
  constructor(private readonly _eventBus: EventBus) {}

  handle(event: TimeEntryEvent): void {
    const clockedInByEmployee =
      event instanceof TimeEntryRecordedEvent && event.entry.source !== TimeEntrySource.MANUAL;

    if (event.actorRole !== Role.ADMIN || clockedInByEmployee) {
      return;
    }

    const { entry } = event;

    this._eventBus.publish(
      new AdminActionEvent({
        actorId: event.actorId,
        action: actionOf(event),
        targetType: AdminAuditTargetType.TIME_ENTRY,
        targetId: entry.rootId,
        targetLabel: `${entry.userName} · ${entry.workdayDate}`,
        reason: event.reason,
        metadata: {
          barId: event.barId,
          userId: entry.userId,
          type: entry.type,
          occurredAt: entry.occurredAt,
          previousOccurredAt: event instanceof TimeEntryAmendedEvent ? event.previousOccurredAt : null,
        },
      }),
    );
  }
}

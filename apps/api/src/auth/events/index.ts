import { RecordAuthEventHandler } from './handlers/record-auth-event.handler';

export * from './handlers/record-auth-event.handler';
export * from './impl/auth-event.event';

export const EventHandlers = [RecordAuthEventHandler];

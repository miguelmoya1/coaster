import { AmendTimeEntryHandler } from './handlers/amend-time-entry.handler';
import { ClockHandler } from './handlers/clock.handler';
import { CreateTimeEntryHandler } from './handlers/create-time-entry.handler';
import { VoidTimeEntryHandler } from './handlers/void-time-entry.handler';

export { AmendTimeEntryCommand } from './impl/amend-time-entry.command';
export { ClockCommand } from './impl/clock.command';
export { CreateTimeEntryCommand } from './impl/create-time-entry.command';
export { VoidTimeEntryCommand } from './impl/void-time-entry.command';

export const CommandHandlers = [ClockHandler, CreateTimeEntryHandler, AmendTimeEntryHandler, VoidTimeEntryHandler];

import { CreateShiftHandler } from './handlers/create-shift.handler';
import { DeleteShiftHandler } from './handlers/delete-shift.handler';

export { CreateShiftCommand } from './impl/create-shift.command';
export { DeleteShiftCommand } from './impl/delete-shift.command';

export const CommandHandlers = [CreateShiftHandler, DeleteShiftHandler];

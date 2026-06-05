import { CreateShiftHandler } from './create-shift/create-shift.handler';
import { DeleteShiftHandler } from './delete-shift/delete-shift.handler';

export { CreateShiftCommand } from './create-shift/create-shift.command';
export { DeleteShiftCommand } from './delete-shift/delete-shift.command';

export const CommandHandlers = [CreateShiftHandler, DeleteShiftHandler];

import { UpdateUserHandler } from './update-user/update-user.handler';
import { UpsertUserHandler } from './upsert-user/upsert-user.handler';

export { UpdateUserCommand } from './update-user/update-user.command';
export { UpsertUserCommand } from './upsert-user/upsert-user.command';

export const CommandHandlers = [UpdateUserHandler, UpsertUserHandler];


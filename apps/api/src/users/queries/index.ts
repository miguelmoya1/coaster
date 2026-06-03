import { GetUserByEmailHandler } from './get-user-by-email/get-user-by-email.handler';
import { GetUserByIdHandler } from './get-user-by-id/get-user-by-id.handler';

export { GetUserByEmailQuery } from './get-user-by-email/get-user-by-email.query';
export { GetUserByIdQuery } from './get-user-by-id/get-user-by-id.query';

export const QueryHandlers = [GetUserByIdHandler, GetUserByEmailHandler];


import { GetUserByEmailHandler } from './handlers/get-user-by-email.handler';
import { GetUserByIdHandler } from './handlers/get-user-by-id.handler';

export { GetUserByEmailQuery } from './impl/get-user-by-email.query';
export { GetUserByIdQuery } from './impl/get-user-by-id.query';

export const QueryHandlers = [GetUserByEmailHandler, GetUserByIdHandler];

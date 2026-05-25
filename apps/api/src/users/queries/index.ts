import { GetUserByIdHandler } from './get-user-by-id/get-user-by-id.handler';

export { GetUserByIdQuery } from './get-user-by-id/get-user-by-id.query';

export const QueryHandlers = [
  GetUserByIdHandler,
];

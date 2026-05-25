import { GetBarByIdHandler } from './get-bar-by-id/get-bar-by-id.handler';
import { GetBarsForUserHandler } from './get-bars-for-user/get-bars-for-user.handler';

export { GetBarByIdQuery } from './get-bar-by-id/get-bar-by-id.query';
export { GetBarsForUserQuery } from './get-bars-for-user/get-bars-for-user.query';

export const QueryHandlers = [
  GetBarByIdHandler,
  GetBarsForUserHandler,
];

import { GetBarByIdHandler } from './handlers/get-bar-by-id.handler';
import { GetBarsForUserHandler } from './handlers/get-bars-for-user.handler';
import { SearchBarsAsAdminHandler } from './handlers/search-bars-as-admin.handler';

export { GetBarByIdQuery } from './impl/get-bar-by-id.query';
export { GetBarsForUserQuery } from './impl/get-bars-for-user.query';
export { SearchBarsAsAdminQuery } from './impl/search-bars-as-admin.query';

export const QueryHandlers = [GetBarByIdHandler, GetBarsForUserHandler, SearchBarsAsAdminHandler];

import { GetBarByIdHandler } from './get-bar-by-id/get-bar-by-id.handler';
import { GetBarsForUserHandler } from './get-bars-for-user/get-bars-for-user.handler';
import { SearchBarsAsAdminHandler } from './search-bars-as-admin/search-bars-as-admin.handler';

export { GetBarByIdQuery } from './get-bar-by-id/get-bar-by-id.query';
export { GetBarsForUserQuery } from './get-bars-for-user/get-bars-for-user.query';
export { SearchBarsAsAdminQuery } from './search-bars-as-admin/search-bars-as-admin.query';

export const QueryHandlers = [GetBarByIdHandler, GetBarsForUserHandler, SearchBarsAsAdminHandler];

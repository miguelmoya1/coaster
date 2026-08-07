import { GetAdminBarDetailHandler } from './handlers/get-admin-bar-detail.handler';
import { GetAdminUserDetailHandler } from './handlers/get-admin-user-detail.handler';
import { GetPlatformMetricsHandler } from './handlers/get-platform-metrics.handler';
import { ListAdminBarsHandler } from './handlers/list-admin-bars.handler';
import { ListAdminUsersHandler } from './handlers/list-admin-users.handler';
import { ListAuditLogHandler } from './handlers/list-audit-log.handler';

export { GetAdminBarDetailQuery } from './impl/get-admin-bar-detail.query';
export { GetAdminUserDetailQuery } from './impl/get-admin-user-detail.query';
export { GetPlatformMetricsQuery } from './impl/get-platform-metrics.query';
export { ListAdminBarsQuery } from './impl/list-admin-bars.query';
export { ListAdminUsersQuery } from './impl/list-admin-users.query';
export { ListAuditLogQuery } from './impl/list-audit-log.query';

export const QueryHandlers = [
  ListAdminBarsHandler,
  GetAdminBarDetailHandler,
  ListAdminUsersHandler,
  GetAdminUserDetailHandler,
  GetPlatformMetricsHandler,
  ListAuditLogHandler,
];

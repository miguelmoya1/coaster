import { GetAdminEstablishmentDetailHandler } from './handlers/get-admin-establishment-detail.handler';
import { GetAdminUserDetailHandler } from './handlers/get-admin-user-detail.handler';
import { GetPlatformMetricsHandler } from './handlers/get-platform-metrics.handler';
import { ListAdminEstablishmentsHandler } from './handlers/list-admin-establishments.handler';
import { ListAdminUsersHandler } from './handlers/list-admin-users.handler';
import { ListAuditLogHandler } from './handlers/list-audit-log.handler';

export { GetAdminEstablishmentDetailQuery } from './impl/get-admin-establishment-detail.query';
export { GetAdminUserDetailQuery } from './impl/get-admin-user-detail.query';
export { GetPlatformMetricsQuery } from './impl/get-platform-metrics.query';
export { ListAdminEstablishmentsQuery } from './impl/list-admin-establishments.query';
export { ListAdminUsersQuery } from './impl/list-admin-users.query';
export { ListAuditLogQuery } from './impl/list-audit-log.query';

export const QueryHandlers = [
  ListAdminEstablishmentsHandler,
  GetAdminEstablishmentDetailHandler,
  ListAdminUsersHandler,
  GetAdminUserDetailHandler,
  GetPlatformMetricsHandler,
  ListAuditLogHandler,
];

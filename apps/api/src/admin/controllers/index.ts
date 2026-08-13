import { AdminEstablishmentsController } from './admin-establishments.controller';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminUsersController } from './admin-users.controller';

export * from './admin-establishments.controller';
export * from './admin-overview.controller';
export * from './admin-users.controller';

export const AdminControllers = [AdminOverviewController, AdminEstablishmentsController, AdminUsersController];

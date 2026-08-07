import { AdminBarsController } from './admin-bars.controller';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminUsersController } from './admin-users.controller';

export * from './admin-bars.controller';
export * from './admin-overview.controller';
export * from './admin-users.controller';

export const AdminControllers = [AdminOverviewController, AdminBarsController, AdminUsersController];

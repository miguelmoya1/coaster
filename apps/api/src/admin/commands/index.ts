import { GrantBarPlanHandler } from './handlers/grant-bar-plan.handler';
import { RenameBarHandler } from './handlers/rename-bar.handler';
import { RevokeBarPlanHandler } from './handlers/revoke-bar-plan.handler';
import { UpdateAdminUserHandler } from './handlers/update-admin-user.handler';

export { GrantBarPlanCommand } from './impl/grant-bar-plan.command';
export { RenameBarCommand } from './impl/rename-bar.command';
export { RevokeBarPlanCommand } from './impl/revoke-bar-plan.command';
export { UpdateAdminUserCommand } from './impl/update-admin-user.command';

export const CommandHandlers = [
  GrantBarPlanHandler,
  RevokeBarPlanHandler,
  RenameBarHandler,
  UpdateAdminUserHandler,
];

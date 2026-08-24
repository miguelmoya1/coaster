import { AddBetaTesterHandler } from './handlers/add-beta-tester.handler';
import { GrantEstablishmentPlanHandler } from './handlers/grant-establishment-plan.handler';
import { RemoveBetaTesterHandler } from './handlers/remove-beta-tester.handler';
import { RenameEstablishmentHandler } from './handlers/rename-establishment.handler';
import { RevokeEstablishmentPlanHandler } from './handlers/revoke-establishment-plan.handler';
import { UpdateAdminUserHandler } from './handlers/update-admin-user.handler';
import { UpdateEstablishmentModulesHandler } from './handlers/update-establishment-modules.handler';

export { AddBetaTesterCommand } from './impl/add-beta-tester.command';
export { GrantEstablishmentPlanCommand } from './impl/grant-establishment-plan.command';
export { RemoveBetaTesterCommand } from './impl/remove-beta-tester.command';
export { RenameEstablishmentCommand } from './impl/rename-establishment.command';
export { RevokeEstablishmentPlanCommand } from './impl/revoke-establishment-plan.command';
export { UpdateAdminUserCommand } from './impl/update-admin-user.command';
export { UpdateEstablishmentModulesCommand } from './impl/update-establishment-modules.command';

export const CommandHandlers = [
  GrantEstablishmentPlanHandler,
  RevokeEstablishmentPlanHandler,
  RenameEstablishmentHandler,
  UpdateAdminUserHandler,
  UpdateEstablishmentModulesHandler,
  AddBetaTesterHandler,
  RemoveBetaTesterHandler,
];

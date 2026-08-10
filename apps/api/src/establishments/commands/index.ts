import { CreateEstablishmentHandler } from './handlers/create-establishment.handler';
import { UpdateEstablishmentSettingsHandler } from './handlers/update-establishment-settings.handler';

export { CreateEstablishmentCommand } from './impl/create-establishment.command';
export { UpdateEstablishmentSettingsCommand } from './impl/update-establishment-settings.command';

export const CommandHandlers = [CreateEstablishmentHandler, UpdateEstablishmentSettingsHandler];

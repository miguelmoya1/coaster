import { GetEstablishmentByIdHandler } from './handlers/get-establishment-by-id.handler';
import { GetEstablishmentSettingsHandler } from './handlers/get-establishment-settings.handler';
import { GetEstablishmentsForUserHandler } from './handlers/get-establishments-for-user.handler';

export { GetEstablishmentByIdQuery } from './impl/get-establishment-by-id.query';
export { GetEstablishmentSettingsQuery } from './impl/get-establishment-settings.query';
export { GetEstablishmentsForUserQuery } from './impl/get-establishments-for-user.query';

export const QueryHandlers = [
  GetEstablishmentByIdHandler,
  GetEstablishmentSettingsHandler,
  GetEstablishmentsForUserHandler,
];

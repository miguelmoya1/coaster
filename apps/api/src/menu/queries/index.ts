import { GetMenuDraftHandler } from './handlers/get-menu-draft.handler';
import { GetPublishedMenuHandler } from './handlers/get-published-menu.handler';

export { GetMenuDraftQuery } from './impl/get-menu-draft.query';
export { GetPublishedMenuQuery } from './impl/get-published-menu.query';

export const QueryHandlers = [GetMenuDraftHandler, GetPublishedMenuHandler];

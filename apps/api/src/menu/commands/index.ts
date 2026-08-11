import { PublishMenuHandler } from './handlers/publish-menu.handler';
import { SaveMenuDraftHandler } from './handlers/save-menu-draft.handler';

export { PublishMenuCommand } from './impl/publish-menu.command';
export { SaveMenuDraftCommand } from './impl/save-menu-draft.command';

export const CommandHandlers = [SaveMenuDraftHandler, PublishMenuHandler];

export * from './impl/establishment-settings-updated.event';

export * from './handlers/forget-modules-cache.handler';

import { ForgetModulesCacheHandler } from './handlers/forget-modules-cache.handler';

export const EventHandlers = [ForgetModulesCacheHandler];

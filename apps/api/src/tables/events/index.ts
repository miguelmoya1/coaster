import { TableCreatedHandler } from './table-created/table-created.handler';
import { TableDeletedHandler } from './table-deleted/table-deleted.handler';
import { TableUpdatedHandler } from './table-updated/table-updated.handler';

export * from './table-created/table-created.event';
export * from './table-created/table-created.handler';
export * from './table-deleted/table-deleted.event';
export * from './table-deleted/table-deleted.handler';
export * from './table-updated/table-updated.event';
export * from './table-updated/table-updated.handler';

export const EventHandlers = [TableCreatedHandler, TableDeletedHandler, TableUpdatedHandler];

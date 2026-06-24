import { CreateTableHandler } from './handlers/create-table.handler';
import { DeleteTableHandler } from './handlers/delete-table.handler';
import { UpdateTableHandler } from './handlers/update-table.handler';

export { CreateTableCommand } from './impl/create-table.command';
export { DeleteTableCommand } from './impl/delete-table.command';
export { UpdateTableCommand } from './impl/update-table.command';

export const CommandHandlers = [CreateTableHandler, DeleteTableHandler, UpdateTableHandler];

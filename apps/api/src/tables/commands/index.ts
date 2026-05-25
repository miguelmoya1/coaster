import { CreateTableHandler } from './create-table/create-table.handler';
import { UpdateTableHandler } from './update-table/update-table.handler';
import { DeleteTableHandler } from './delete-table/delete-table.handler';

export { CreateTableCommand } from './create-table/create-table.command';
export { UpdateTableCommand } from './update-table/update-table.command';
export { DeleteTableCommand } from './delete-table/delete-table.command';

export const CommandHandlers = [
  CreateTableHandler,
  UpdateTableHandler,
  DeleteTableHandler,
];

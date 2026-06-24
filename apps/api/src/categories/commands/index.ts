import { CreateCategoryHandler } from './handlers/create-category.handler';
import { DeleteCategoryHandler } from './handlers/delete-category.handler';
import { UpdateCategoryHandler } from './handlers/update-category.handler';

export { CreateCategoryCommand } from './impl/create-category.command';
export { DeleteCategoryCommand } from './impl/delete-category.command';
export { UpdateCategoryCommand } from './impl/update-category.command';

export const CommandHandlers = [CreateCategoryHandler, DeleteCategoryHandler, UpdateCategoryHandler];

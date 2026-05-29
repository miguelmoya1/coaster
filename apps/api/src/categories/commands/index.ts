import { CreateCategoryHandler } from './create-category/create-category.handler';
import { DeleteCategoryHandler } from './delete-category/delete-category.handler';
import { UpdateCategoryHandler } from './update-category/update-category.handler';

export { CreateCategoryCommand } from './create-category/create-category.command';
export { UpdateCategoryCommand } from './update-category/update-category.command';
export { DeleteCategoryCommand } from './delete-category/delete-category.command';

export const CommandHandlers = [CreateCategoryHandler, UpdateCategoryHandler, DeleteCategoryHandler];

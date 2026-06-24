import { FindAllCategoryTemplatesHandler } from './handlers/find-all-category-templates.handler';
import { FindAllProductTemplatesHandler } from './handlers/find-all-product-templates.handler';

export { FindAllCategoryTemplatesQuery } from './impl/find-all-category-templates.query';
export { FindAllProductTemplatesQuery } from './impl/find-all-product-templates.query';

export const QueryHandlers = [FindAllCategoryTemplatesHandler, FindAllProductTemplatesHandler];

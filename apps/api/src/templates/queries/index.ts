import { FindAllCategoryTemplatesHandler } from './find-all-category-templates/find-all-category-templates.handler';
import { FindAllProductTemplatesHandler } from './find-all-product-templates/find-all-product-templates.handler';

export { FindAllCategoryTemplatesQuery } from './find-all-category-templates/find-all-category-templates.query';
export { FindAllProductTemplatesQuery } from './find-all-product-templates/find-all-product-templates.query';

export const QueryHandlers = [FindAllCategoryTemplatesHandler, FindAllProductTemplatesHandler];

import { BulkUpsertTemplatesHandler } from './handlers/bulk-upsert-templates.handler';
import { CreateCategoryTemplateHandler } from './handlers/create-category-template.handler';
import { CreateProductTemplateHandler } from './handlers/create-product-template.handler';
import { DeleteCategoryTemplateHandler } from './handlers/delete-category-template.handler';
import { DeleteProductTemplateHandler } from './handlers/delete-product-template.handler';
import { ImportTemplatesToEstablishmentHandler } from './handlers/import-templates-to-establishment.handler';
import { UpdateCategoryTemplateHandler } from './handlers/update-category-template.handler';
import { UpdateProductTemplateHandler } from './handlers/update-product-template.handler';

export { BulkUpsertTemplatesCommand } from './impl/bulk-upsert-templates.command';
export type { BulkCategoryTemplateInput } from './impl/bulk-upsert-templates.command';
export { CreateCategoryTemplateCommand } from './impl/create-category-template.command';
export { CreateProductTemplateCommand } from './impl/create-product-template.command';
export { DeleteCategoryTemplateCommand } from './impl/delete-category-template.command';
export { DeleteProductTemplateCommand } from './impl/delete-product-template.command';
export { ImportTemplatesToEstablishmentCommand } from './impl/import-templates-to-establishment.command';
export { UpdateCategoryTemplateCommand } from './impl/update-category-template.command';
export { UpdateProductTemplateCommand } from './impl/update-product-template.command';

export const CommandHandlers = [
  BulkUpsertTemplatesHandler,
  CreateCategoryTemplateHandler,
  CreateProductTemplateHandler,
  DeleteCategoryTemplateHandler,
  DeleteProductTemplateHandler,
  ImportTemplatesToEstablishmentHandler,
  UpdateCategoryTemplateHandler,
  UpdateProductTemplateHandler,
];

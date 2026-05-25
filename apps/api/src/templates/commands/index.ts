import { CreateCategoryTemplateHandler } from './create-category-template/create-category-template.handler';
import { UpdateCategoryTemplateHandler } from './update-category-template/update-category-template.handler';
import { DeleteCategoryTemplateHandler } from './delete-category-template/delete-category-template.handler';
import { CreateProductTemplateHandler } from './create-product-template/create-product-template.handler';
import { UpdateProductTemplateHandler } from './update-product-template/update-product-template.handler';
import { DeleteProductTemplateHandler } from './delete-product-template/delete-product-template.handler';
import { ImportTemplatesToBarHandler } from './import-templates-to-bar/import-templates-to-bar.handler';
import { BulkUpsertTemplatesHandler } from './bulk-upsert-templates/bulk-upsert-templates.handler';

export { CreateCategoryTemplateCommand } from './create-category-template/create-category-template.command';
export { UpdateCategoryTemplateCommand } from './update-category-template/update-category-template.command';
export { DeleteCategoryTemplateCommand } from './delete-category-template/delete-category-template.command';
export { CreateProductTemplateCommand } from './create-product-template/create-product-template.command';
export { UpdateProductTemplateCommand } from './update-product-template/update-product-template.command';
export { DeleteProductTemplateCommand } from './delete-product-template/delete-product-template.command';
export { ImportTemplatesToBarCommand } from './import-templates-to-bar/import-templates-to-bar.command';
export { BulkUpsertTemplatesCommand } from './bulk-upsert-templates/bulk-upsert-templates.command';
export type { BulkCategoryTemplateInput } from './bulk-upsert-templates/bulk-upsert-templates.command';

export const CommandHandlers = [
  CreateCategoryTemplateHandler,
  UpdateCategoryTemplateHandler,
  DeleteCategoryTemplateHandler,
  CreateProductTemplateHandler,
  UpdateProductTemplateHandler,
  DeleteProductTemplateHandler,
  ImportTemplatesToBarHandler,
  BulkUpsertTemplatesHandler,
];

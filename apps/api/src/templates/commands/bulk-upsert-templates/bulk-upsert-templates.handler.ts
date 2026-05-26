import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BulkUpsertTemplatesCommand } from './bulk-upsert-templates.command';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { commonMapper } from '../../../core/mappers/common.mapper';

@CommandHandler(BulkUpsertTemplatesCommand)
export class BulkUpsertTemplatesHandler implements ICommandHandler<BulkUpsertTemplatesCommand, any> {
  constructor(private readonly _templatesRepository: TemplatesRepository) {}

  async execute(command: BulkUpsertTemplatesCommand): Promise<any> {
    for (const categoryJson of command.categoriesJson) {
      const categorySlug = this._slugify(categoryJson.name);
      const categoryNameKey = `templates.categories.${categorySlug}`;
      const categoryIcon = categoryJson.icon ?? null;

      const categoryTemplate = await this._templatesRepository.upsertCategoryTemplate(categoryNameKey, categoryIcon);

      if (categoryJson.products && Array.isArray(categoryJson.products)) {
        for (const productJson of categoryJson.products) {
          const productSlug = this._slugify(productJson.name);
          const productNameKey = `templates.products.${productSlug}`;
          const productPrice = productJson.price ?? 0;

          await this._templatesRepository.upsertProductTemplate(productNameKey, productPrice, categoryTemplate.id);
        }
      }
    }

    return commonMapper.getSuccessResponse();
  }

  private _slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}

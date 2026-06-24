import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { BulkUpsertTemplatesCommand } from '../impl/bulk-upsert-templates.command';
import { BulkUpsertTemplatesHandler } from './bulk-upsert-templates.handler';

describe('BulkUpsertTemplatesHandler', () => {
  let handler: BulkUpsertTemplatesHandler;
  const repository = {
    upsertCategoryTemplate: vi.fn(),
    upsertProductTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BulkUpsertTemplatesHandler, { provide: TemplatesWriteRepository, useValue: repository }],
    }).compile();

    handler = module.get<BulkUpsertTemplatesHandler>(BulkUpsertTemplatesHandler);
  });

  it('should correctly slugify, translate key, and upsert templates', async () => {
    const categoriesJson = [
      {
        name: 'Cafetería',
        icon: 'coffee',
        products: [
          { name: 'Café Solo', price: 120 },
          { name: 'Té Verde', price: 150 },
        ],
      },
    ];

    const mockCategoryTemplate = { id: 'cat-1', name: 'templates.categories.cafeteria', icon: 'coffee' };

    repository.upsertCategoryTemplate.mockResolvedValue(mockCategoryTemplate);
    repository.upsertProductTemplate.mockResolvedValue({
      id: 'p1',
      name: 'templates.products.cafe_solo',
      price: 120,
      categoryId: 'cat-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new BulkUpsertTemplatesCommand(categoriesJson));

    expect(repository.upsertCategoryTemplate).toHaveBeenCalledWith('templates.categories.cafeteria', 'coffee');
    expect(repository.upsertProductTemplate).toHaveBeenCalledWith('templates.products.cafe_solo', 120, 'cat-1');
    expect(repository.upsertProductTemplate).toHaveBeenCalledWith('templates.products.te_verde', 150, 'cat-1');
    expect(result).toEqual({ success: true });
  });
});

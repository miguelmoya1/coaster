import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { TemplatesReadRepository } from '../../data-access/templates.read.repository';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { ImportTemplatesToBarCommand } from '../impl/import-templates-to-bar.command';
import { ImportTemplatesToBarHandler } from './import-templates-to-bar.handler';

describe('ImportTemplatesToBarHandler', () => {
  let handler: ImportTemplatesToBarHandler;
  const repository = {
    findCategoryTemplatesByIds: vi.fn(),
    createManyCategories: vi.fn(),
    findCategoriesByBarIdAndNames: vi.fn(),
    createManyProducts: vi.fn(),
    findProductsByCategoryIds: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportTemplatesToBarHandler,
        { provide: TemplatesWriteRepository, useValue: repository },
        { provide: TemplatesReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<ImportTemplatesToBarHandler>(ImportTemplatesToBarHandler);
  });

  const barId = asBarId('bar-1');

  it('should throw BadRequestException if categoryTemplateIds is empty', async () => {
    await expect(handler.execute(new ImportTemplatesToBarCommand(barId, { categoryTemplateIds: [] }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw NotFoundException if no category templates are found', async () => {
    repository.findCategoryTemplatesByIds.mockResolvedValue([]);

    await expect(
      handler.execute(new ImportTemplatesToBarCommand(barId, { categoryTemplateIds: ['id-1'] })),
    ).rejects.toThrow(NotFoundException);
  });

  it('should correctly import templates to a bar', async () => {
    const mockCategoryTemplates = [
      {
        id: 'temp-cat-1',
        name: 'Bebidas',
        icon: 'cup',
        products: [
          { id: 'temp-prod-1', name: 'Agua', price: 1.5 },
          { id: 'temp-prod-2', name: 'Coca Cola', price: 2.0 },
        ],
      },
    ];

    const mockCreatedCategories = [{ id: 'real-cat-1', name: 'Bebidas' }];

    repository.findCategoryTemplatesByIds.mockResolvedValue(mockCategoryTemplates);
    repository.createManyCategories.mockResolvedValue({ count: 1 });
    repository.findCategoriesByBarIdAndNames.mockResolvedValueOnce([]);
    repository.findCategoriesByBarIdAndNames.mockResolvedValueOnce(mockCreatedCategories);
    repository.findProductsByCategoryIds.mockResolvedValue([]);
    repository.createManyProducts.mockResolvedValue({ count: 2 });

    await handler.execute(new ImportTemplatesToBarCommand(barId, { categoryTemplateIds: ['temp-cat-1'] }));

    expect(repository.findCategoryTemplatesByIds).toHaveBeenCalledWith(['temp-cat-1']);
    expect(repository.createManyCategories).toHaveBeenCalledWith([{ barId, name: 'Bebidas', icon: 'cup' }], true);
  });
});

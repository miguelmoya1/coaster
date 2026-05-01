import { ErrorCodes } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { Category, CategoryTemplate, ProductTemplate } from '../../core';
import { TemplatesRepository } from '../data-access/templates.repository';
import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let repository: Mocked<TemplatesRepository>;

  beforeEach(async () => {
    const mockRepo = {
      findAllCategoryTemplates: vi.fn(),
      createCategoryTemplate: vi.fn(),
      updateCategoryTemplate: vi.fn(),
      deleteCategoryTemplate: vi.fn(),
      findAllProductTemplates: vi.fn(),
      createProductTemplate: vi.fn(),
      updateProductTemplate: vi.fn(),
      deleteProductTemplate: vi.fn(),
      findCategoryTemplatesByIds: vi.fn(),
      createManyCategories: vi.fn(),
      findCategoriesByBarIdAndNames: vi.fn(),
      createManyProducts: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService, { provide: TemplatesRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    repository = module.get(TemplatesRepository);
  });

  describe('Category Templates', () => {
    it('should return all category templates', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'Cat 1',
          icon: 'icon-1',
          products: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      repository.findAllCategoryTemplates.mockResolvedValue(mockTemplates);

      const result = await service.findAllCategoryTemplates();

      expect(vi.mocked(repository.findAllCategoryTemplates)).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cat 1');
    });

    it('should create a category template', async () => {
      const data = { name: 'New Cat', icon: 'new-icon' };
      const mockTemplate = { ...data, id: '2', products: [], createdAt: new Date(), updatedAt: new Date() };
      repository.createCategoryTemplate.mockResolvedValue(mockTemplate);

      const result = await service.createCategoryTemplate(data);

      expect(vi.mocked(repository.createCategoryTemplate)).toHaveBeenCalledWith(data);
      expect(result.name).toBe('New Cat');
    });

    it('should update a category template', async () => {
      const data = { name: 'Updated Cat' };
      const mockTemplate = {
        id: '1',
        name: 'Updated Cat',
        icon: 'icon-1',
        products: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.updateCategoryTemplate.mockResolvedValue(mockTemplate);

      const result = await service.updateCategoryTemplate('1', data);

      expect(vi.mocked(repository.updateCategoryTemplate)).toHaveBeenCalledWith('1', data);
      expect(result.name).toBe('Updated Cat');
    });

    it('should delete a category template', async () => {
      repository.deleteCategoryTemplate.mockResolvedValue({ id: '1' } as CategoryTemplate);

      const result = await service.deleteCategoryTemplate('1');

      expect(vi.mocked(repository.deleteCategoryTemplate)).toHaveBeenCalledWith('1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Product Templates', () => {
    it('should return all product templates', async () => {
      const mockTemplates = [
        {
          id: 'p1',
          name: 'Prod 1',
          price: 10,
          categoryId: 'c1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      repository.findAllProductTemplates.mockResolvedValue(
        mockTemplates as (ProductTemplate & { category: CategoryTemplate })[],
      );

      const result = await service.findAllProductTemplates();

      expect(vi.mocked(repository.findAllProductTemplates)).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Prod 1');
    });

    it('should create a product template', async () => {
      const data = { name: 'New Prod', price: 15, categoryId: 'c1' };
      const mockTemplate = { ...data, id: 'p2', createdAt: new Date(), updatedAt: new Date() };
      repository.createProductTemplate.mockResolvedValue(mockTemplate);

      const result = await service.createProductTemplate(data);

      expect(vi.mocked(repository.createProductTemplate)).toHaveBeenCalledWith(data);
      expect(result.name).toBe('New Prod');
    });

    it('should update a product template', async () => {
      const data = { name: 'Updated Prod' };
      const mockTemplate = {
        id: 'p1',
        name: 'Updated Prod',
        price: 10,
        categoryId: 'c1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repository.updateProductTemplate.mockResolvedValue(mockTemplate);

      const result = await service.updateProductTemplate('p1', data);

      expect(vi.mocked(repository.updateProductTemplate)).toHaveBeenCalledWith('p1', data);
      expect(result.name).toBe('Updated Prod');
    });

    it('should delete a product template', async () => {
      repository.deleteProductTemplate.mockResolvedValue({ id: 'p1' } as ProductTemplate);

      const result = await service.deleteProductTemplate('p1');

      expect(vi.mocked(repository.deleteProductTemplate)).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('importTemplatesToBar', () => {
    const barId = 'bar-1';

    it('should throw BadRequestException if categoryTemplateIds is empty', async () => {
      await expect(service.importTemplatesToBar(barId, { categoryTemplateIds: [] })).rejects.toThrow(
        new BadRequestException(ErrorCodes.REQUIRED),
      );
    });

    it('should throw NotFoundException if no category templates are found', async () => {
      repository.findCategoryTemplatesByIds.mockResolvedValue([]);

      await expect(service.importTemplatesToBar(barId, { categoryTemplateIds: ['id-1'] })).rejects.toThrow(
        new NotFoundException(ErrorCodes.CATEGORY_NOT_FOUND),
      );
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

      repository.findCategoryTemplatesByIds.mockResolvedValue(
        mockCategoryTemplates as unknown as (CategoryTemplate & { products: ProductTemplate[] })[],
      );
      repository.createManyCategories.mockResolvedValue({ count: 1 });
      repository.findCategoriesByBarIdAndNames.mockResolvedValue(mockCreatedCategories as unknown as Category[]);
      repository.createManyProducts.mockResolvedValue({ count: 2 });

      const result = await service.importTemplatesToBar(barId, { categoryTemplateIds: ['temp-cat-1'] });

      expect(vi.mocked(repository.findCategoryTemplatesByIds)).toHaveBeenCalledWith(['temp-cat-1']);
      expect(vi.mocked(repository.createManyCategories)).toHaveBeenCalledWith([{ barId, name: 'Bebidas', icon: 'cup' }], true);
      expect(vi.mocked(repository.findCategoriesByBarIdAndNames)).toHaveBeenCalledWith(barId, ['Bebidas']);
      expect(vi.mocked(repository.createManyProducts)).toHaveBeenCalledWith(
        [
          { categoryId: 'real-cat-1', name: 'Agua', price: 1.5, currentStock: 0, minStockAlert: 0 },
          { categoryId: 'real-cat-1', name: 'Coca Cola', price: 2.0, currentStock: 0, minStockAlert: 0 },
        ],
        true,
      );
      expect(result).toEqual({ success: true });
    });
  });
});

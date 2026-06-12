import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesReadRepository } from '../../data-access/templates.read.repository';
import { FindAllCategoryTemplatesHandler } from './find-all-category-templates.handler';
import { FindAllCategoryTemplatesQuery } from './find-all-category-templates.query';

describe('FindAllCategoryTemplatesHandler', () => {
  let handler: FindAllCategoryTemplatesHandler;
  const repository = {
    findAllCategoryTemplates: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FindAllCategoryTemplatesHandler, { provide: TemplatesReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<FindAllCategoryTemplatesHandler>(FindAllCategoryTemplatesHandler);
  });

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

    const result = await handler.execute(new FindAllCategoryTemplatesQuery());

    expect(repository.findAllCategoryTemplates).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cat 1');
  });
});

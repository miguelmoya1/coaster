import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { UpdateCategoryTemplateCommand } from './update-category-template.command';
import { UpdateCategoryTemplateHandler } from './update-category-template.handler';

describe('UpdateCategoryTemplateHandler', () => {
  let handler: UpdateCategoryTemplateHandler;
  const repository = {
    updateCategoryTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateCategoryTemplateHandler, { provide: TemplatesRepository, useValue: repository }],
    }).compile();

    handler = module.get<UpdateCategoryTemplateHandler>(UpdateCategoryTemplateHandler);
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

    const result = await handler.execute(new UpdateCategoryTemplateCommand('1', data));

    expect(repository.updateCategoryTemplate).toHaveBeenCalledWith('1', data);
    expect(result.name).toBe('Updated Cat');
  });
});

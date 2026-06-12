import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { CreateCategoryTemplateCommand } from './create-category-template.command';
import { CreateCategoryTemplateHandler } from './create-category-template.handler';

describe('CreateCategoryTemplateHandler', () => {
  let handler: CreateCategoryTemplateHandler;
  const repository = {
    createCategoryTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateCategoryTemplateHandler, { provide: TemplatesWriteRepository, useValue: repository }],
    }).compile();

    handler = module.get<CreateCategoryTemplateHandler>(CreateCategoryTemplateHandler);
  });

  it('should create a category template', async () => {
    const data = { name: 'New Cat', icon: 'new-icon' };
    const mockTemplate = { ...data, id: '2', products: [], createdAt: new Date(), updatedAt: new Date() };
    repository.createCategoryTemplate.mockResolvedValue(mockTemplate);

    await handler.execute(new CreateCategoryTemplateCommand(data));

    expect(repository.createCategoryTemplate).toHaveBeenCalledWith(data);
  });
});

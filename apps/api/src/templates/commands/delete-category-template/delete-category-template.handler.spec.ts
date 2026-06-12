import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesWriteRepository } from '../../data-access/templates.write.repository';
import { DeleteCategoryTemplateCommand } from './delete-category-template.command';
import { DeleteCategoryTemplateHandler } from './delete-category-template.handler';

describe('DeleteCategoryTemplateHandler', () => {
  let handler: DeleteCategoryTemplateHandler;
  const repository = {
    deleteCategoryTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteCategoryTemplateHandler, { provide: TemplatesWriteRepository, useValue: repository }],
    }).compile();

    handler = module.get<DeleteCategoryTemplateHandler>(DeleteCategoryTemplateHandler);
  });

  it('should delete a category template', async () => {
    repository.deleteCategoryTemplate.mockResolvedValue({ id: '1' });

    const result = await handler.execute(new DeleteCategoryTemplateCommand('1'));

    expect(repository.deleteCategoryTemplate).toHaveBeenCalledWith('1');
    expect(result).toEqual({ success: true });
  });
});

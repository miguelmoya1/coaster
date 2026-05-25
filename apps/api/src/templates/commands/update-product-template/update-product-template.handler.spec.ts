import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProductTemplateHandler } from './update-product-template.handler';
import { UpdateProductTemplateCommand } from './update-product-template.command';
import { TemplatesRepository } from '../../data-access/templates.repository';

describe('UpdateProductTemplateHandler', () => {
  let handler: UpdateProductTemplateHandler;
  let repository = {
    updateProductTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductTemplateHandler,
        { provide: TemplatesRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<UpdateProductTemplateHandler>(UpdateProductTemplateHandler);
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

    const result = await handler.execute(new UpdateProductTemplateCommand('p1', data));

    expect(repository.updateProductTemplate).toHaveBeenCalledWith('p1', data);
    expect(result.name).toBe('Updated Prod');
  });
});

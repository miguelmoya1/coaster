import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateProductTemplateHandler } from './create-product-template.handler';
import { CreateProductTemplateCommand } from './create-product-template.command';
import { TemplatesRepository } from '../../data-access/templates.repository';

describe('CreateProductTemplateHandler', () => {
  let handler: CreateProductTemplateHandler;
  let repository = {
    createProductTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateProductTemplateHandler, { provide: TemplatesRepository, useValue: repository }],
    }).compile();

    handler = module.get<CreateProductTemplateHandler>(CreateProductTemplateHandler);
  });

  it('should create a product template', async () => {
    const data = { name: 'New Prod', price: 15, categoryId: 'c1' };
    const mockTemplate = { ...data, id: 'p2', createdAt: new Date(), updatedAt: new Date() };
    repository.createProductTemplate.mockResolvedValue(mockTemplate);

    const result = await handler.execute(new CreateProductTemplateCommand(data));

    expect(repository.createProductTemplate).toHaveBeenCalledWith(data);
    expect(result.name).toBe('New Prod');
  });
});

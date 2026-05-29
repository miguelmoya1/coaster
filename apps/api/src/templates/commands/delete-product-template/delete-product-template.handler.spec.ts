import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../../data-access/templates.repository';
import { DeleteProductTemplateCommand } from './delete-product-template.command';
import { DeleteProductTemplateHandler } from './delete-product-template.handler';

describe('DeleteProductTemplateHandler', () => {
  let handler: DeleteProductTemplateHandler;
  const repository = {
    deleteProductTemplate: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeleteProductTemplateHandler, { provide: TemplatesRepository, useValue: repository }],
    }).compile();

    handler = module.get<DeleteProductTemplateHandler>(DeleteProductTemplateHandler);
  });

  it('should delete a product template', async () => {
    repository.deleteProductTemplate.mockResolvedValue({ id: 'p1' });

    const result = await handler.execute(new DeleteProductTemplateCommand('p1'));

    expect(repository.deleteProductTemplate).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ success: true });
  });
});

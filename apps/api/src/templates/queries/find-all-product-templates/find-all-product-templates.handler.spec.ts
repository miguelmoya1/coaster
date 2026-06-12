import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesReadRepository } from '../../data-access/templates.read.repository';
import { FindAllProductTemplatesHandler } from './find-all-product-templates.handler';
import { FindAllProductTemplatesQuery } from './find-all-product-templates.query';

describe('FindAllProductTemplatesHandler', () => {
  let handler: FindAllProductTemplatesHandler;
  const repository = {
    findAllProductTemplates: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FindAllProductTemplatesHandler, { provide: TemplatesReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<FindAllProductTemplatesHandler>(FindAllProductTemplatesHandler);
  });

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
    repository.findAllProductTemplates.mockResolvedValue(mockTemplates);

    const result = await handler.execute(new FindAllProductTemplatesQuery());

    expect(repository.findAllProductTemplates).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Prod 1');
  });
});

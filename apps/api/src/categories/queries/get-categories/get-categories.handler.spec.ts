import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetCategoriesHandler } from './get-categories.handler';
import { GetCategoriesQuery } from './get-categories.query';
import { CategoriesRepository } from '../../data-access/categories.repository';
import { asBarId } from '@coaster/common';

describe('GetCategoriesHandler', () => {
  let handler: GetCategoriesHandler;
  let repository = {
    findByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoriesHandler,
        { provide: CategoriesRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<GetCategoriesHandler>(GetCategoriesHandler);
  });

  it('should return categories', async () => {
    const barId = asBarId('bar-1');
    repository.findByBarId.mockResolvedValue([]);

    const result = await handler.execute(new GetCategoriesQuery(barId));

    expect(repository.findByBarId).toHaveBeenCalledWith(barId);
    expect(result).toEqual([]);
  });
});

import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesReadRepository } from '../../data-access/categories.read.repository';
import { GetCategoriesQuery } from '../impl/get-categories.query';
import { GetCategoriesHandler } from './get-categories.handler';

describe('GetCategoriesHandler', () => {
  let handler: GetCategoriesHandler;
  const repository = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetCategoriesHandler, { provide: CategoriesReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetCategoriesHandler>(GetCategoriesHandler);
  });

  it('should return categories', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    repository.findByEstablishmentId.mockResolvedValue([]);

    const result = await handler.execute(new GetCategoriesQuery(establishmentId));

    expect(repository.findByEstablishmentId).toHaveBeenCalledWith(establishmentId);
    expect(result).toEqual([]);
  });
});

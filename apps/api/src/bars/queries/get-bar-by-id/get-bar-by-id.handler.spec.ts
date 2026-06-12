import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId } from '../../../core';
import { BarReadRepository } from '../../data-access/bar.read.repository';
import { GetBarByIdHandler } from './get-bar-by-id.handler';
import { GetBarByIdQuery } from './get-bar-by-id.query';

describe('GetBarByIdHandler', () => {
  let handler: GetBarByIdHandler;
  const repository = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetBarByIdHandler, { provide: BarReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetBarByIdHandler>(GetBarByIdHandler);
  });

  it('should return bar by ID', async () => {
    const barId = asBarId('bar-1');
    repository.findById.mockResolvedValue({
      id: 'bar-1',
      name: 'El Bar',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new GetBarByIdQuery(barId));

    expect(repository.findById).toHaveBeenCalledWith(barId);
    expect(result?.id).toBe(barId);
    expect(result?.name).toBe('El Bar');
  });

  it('should return null if bar is not found', async () => {
    const barId = asBarId('non-existent');
    repository.findById.mockResolvedValue(null);

    const result = await handler.execute(new GetBarByIdQuery(barId));
    expect(result).toBeNull();
  });
});

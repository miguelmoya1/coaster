import { asEstablishmentId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentReadRepository } from '../../data-access/establishment.read.repository';
import { GetEstablishmentByIdQuery } from '../impl/get-establishment-by-id.query';
import { GetEstablishmentByIdHandler } from './get-establishment-by-id.handler';

describe('GetEstablishmentByIdHandler', () => {
  let handler: GetEstablishmentByIdHandler;
  const repository = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetEstablishmentByIdHandler, { provide: EstablishmentReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetEstablishmentByIdHandler>(GetEstablishmentByIdHandler);
  });

  it('should return establishment by ID', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    repository.findById.mockResolvedValue({
      id: 'establishment-1',
      name: 'El Establishment',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new GetEstablishmentByIdQuery(establishmentId));

    expect(repository.findById).toHaveBeenCalledWith(establishmentId);
    expect(result?.id).toBe(establishmentId);
    expect(result?.name).toBe('El Establishment');
  });

  it('should return null if establishment is not found', async () => {
    const establishmentId = asEstablishmentId('non-existent');
    repository.findById.mockResolvedValue(null);

    const result = await handler.execute(new GetEstablishmentByIdQuery(establishmentId));
    expect(result).toBeNull();
  });
});

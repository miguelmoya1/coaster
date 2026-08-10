import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentRepository } from '../data-access/establishment-repository';
import { CreateEstablishment } from './create-establishment';

describe('CreateEstablishment', () => {
  let service: CreateEstablishment;
  const repositoryMock = {
    create: vi.fn(),
    routes: {
      myEstablishments: '/establishments',
      establishment: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}`,
      create: '/establishments',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: EstablishmentRepository,
          useValue: repositoryMock,
        },
      ],
    }).compileComponents();

    service = TestBed.inject(CreateEstablishment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute function', () => {
    it('should call repository.create on execute', async () => {
      const dto = { name: 'New Establishment' };

      await service.execute(dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(dto);
    });

    it('should return void', async () => {
      const dto = { name: 'New Establishment' };
      repositoryMock.create.mockResolvedValue(undefined);

      const result = await service.execute(dto);

      expect(result).toBeUndefined();
    });
  });
});

import { asEstablishmentId } from '@coaster/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../data-access/templates-repository';
import { ImportTemplatesToEstablishment } from './import-templates-to-establishment';

describe('ImportTemplatesToEstablishment', () => {
  let service: ImportTemplatesToEstablishment;

  const repositoryMock = {
    importToEstablishment: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [ImportTemplatesToEstablishment, { provide: TemplatesRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(ImportTemplatesToEstablishment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate importToEstablishment to repository', async () => {
    const establishmentId = asEstablishmentId('establishment-123');
    const ids = ['cat-1', 'cat-2'];

    const result = await service.execute(establishmentId, ids);

    expect(result).toBeUndefined();
    expect(repositoryMock.importToEstablishment).toHaveBeenCalledWith(establishmentId, ids);
  });
});

import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../data-access/templates-repository';
import { ImportTemplatesToBar } from './import-templates-to-bar';

describe('ImportTemplatesToBar', () => {
  let service: ImportTemplatesToBar;

  const repositoryMock = {
    importToBar: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        ImportTemplatesToBar,
        { provide: TemplatesRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(ImportTemplatesToBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should delegate importToBar to repository', async () => {
    const barId = asBarId('bar-123');
    const ids = ['cat-1', 'cat-2'];

    const result = await service.execute(barId, ids);

    expect(result).toEqual({ success: true });
    expect(repositoryMock.importToBar).toHaveBeenCalledWith(barId, ids);
  });
});

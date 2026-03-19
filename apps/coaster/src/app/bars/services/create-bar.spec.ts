import { TestBed } from '@angular/core/testing';
import { Mock, vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { CreateBar } from './create-bar';

describe('CreateBar', () => {
  let service: CreateBar;
  let repositoryMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: BarRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(CreateBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.create on create', async () => {
    const dto = { name: 'New Bar' };
    repositoryMock['create'].mockResolvedValue({ id: '1', name: 'New Bar' });

    const result = await service.create(dto);

    expect(repositoryMock['create']).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1', name: 'New Bar' });
  });
});

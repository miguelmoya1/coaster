import { TestBed } from '@angular/core/testing';
import type { BarId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { CreateBar } from './create-bar';

describe('CreateBar', () => {
  let service: CreateBar;
  const repositoryMock = {
    create: vi.fn(),
    routes: {
      myBars: '/bars',
      bar: (barId: BarId) => `/bars/${barId}`,
      create: '/bars',
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: BarRepository,
          useValue: repositoryMock,
        },
      ],
    }).compileComponents();

    service = TestBed.inject(CreateBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute function', () => {
    it('should call repository.create on execute', async () => {
      const dto = { name: 'New Bar' };

      await service.execute(dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(dto);
    });

    it('should return void', async () => {
      const dto = { name: 'New Bar' };
      repositoryMock.create.mockResolvedValue(undefined);

      const result = await service.execute(dto);

      expect(result).toBeUndefined();
    });
  });
});

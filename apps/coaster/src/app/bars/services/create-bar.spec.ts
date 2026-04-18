import { TestBed } from '@angular/core/testing';
import { asBarId, BarId } from '@coaster/interfaces';
import { vi } from 'vitest';
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
      repositoryMock.create.mockResolvedValue({ id: asBarId('1'), name: 'New Bar' });

      const result = await service.execute(dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', name: 'New Bar' });
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { AdminSearchBars } from './admin-search-bars';

describe('AdminSearchBars', () => {
  let service: AdminSearchBars;

  const repositoryMock = {
    routes: {
      adminSearch: vi.fn((q: string) => `/bars/admin/search?q=${q}`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BarRepository, useValue: repositoryMock },
      ],
    });
    service = TestBed.inject(AdminSearchBars);
  });

  it('should return undefined if query is empty', () => {
    expect(service.execute(undefined)).toBeUndefined();
    expect(service.execute('')).toBeUndefined();
    expect(service.execute('   ')).toBeUndefined();
  });

  it('should return the search route', () => {
    expect(service.execute('test')).toBe('/bars/admin/search?q=test');
    expect(service.execute('  test  ')).toBe('/bars/admin/search?q=test');
  });
});

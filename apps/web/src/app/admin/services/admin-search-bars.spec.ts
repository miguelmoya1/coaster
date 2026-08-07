import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository } from '../data-access/admin-repository';
import { AdminSearchBars } from './admin-search-bars';

describe('AdminSearchBars', () => {
  let service: AdminSearchBars;

  const repositoryMock = {
    routes: {
      searchBars: vi.fn((q: string) => `/bars/admin/search?q=${q}`),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: AdminRepository, useValue: repositoryMock }],
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

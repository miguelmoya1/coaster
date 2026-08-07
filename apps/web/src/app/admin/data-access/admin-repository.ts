import { Service } from '@angular/core';

@Service()
export class AdminRepository {
  public readonly routes = {
    searchBars: (query: string) => `/bars/admin/search?q=${query}`,
  };
}

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PageRequest {
  page?: number;
  pageSize?: number;
}

export const resolvePage = (request: PageRequest): { page: number; pageSize: number } => ({
  page: Math.max(1, Math.trunc(request.page ?? 1)),
  pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(request.pageSize ?? DEFAULT_PAGE_SIZE))),
});

export const daysAgo = (days: number, from = new Date()): Date =>
  new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

export const daysFromNow = (days: number, from = new Date()): Date =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

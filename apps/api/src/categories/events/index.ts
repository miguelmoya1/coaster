import { CategoryDeletedHandler } from './category-deleted/category-deleted.handler';

export * from './category-deleted/category-deleted.event';
export * from './category-deleted/category-deleted.handler';

export const EventHandlers = [CategoryDeletedHandler];

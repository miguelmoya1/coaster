import { ProductCreatedHandler } from './product-created/product-created.handler';
import { ProductDeletedHandler } from './product-deleted/product-deleted.handler';
import { ProductStockChangedHandler } from './product-stock-changed/product-stock-changed.handler';

export * from './product-created/product-created.event';
export * from './product-created/product-created.handler';
export * from './product-deleted/product-deleted.event';
export * from './product-deleted/product-deleted.handler';
export * from './product-stock-changed/product-stock-changed.event';
export * from './product-stock-changed/product-stock-changed.handler';

export const EventHandlers = [ProductCreatedHandler, ProductDeletedHandler, ProductStockChangedHandler];

import { AdjustProductStockHandler } from './handlers/adjust-product-stock.handler';
import { CreateProductHandler } from './handlers/create-product.handler';
import { DeleteProductHandler } from './handlers/delete-product.handler';
import { UpdateProductHandler } from './handlers/update-product.handler';
import { UpdateProductStockHandler } from './handlers/update-product-stock.handler';

export { AdjustProductStockCommand } from './impl/adjust-product-stock.command';
export { CreateProductCommand } from './impl/create-product.command';
export { DeleteProductCommand } from './impl/delete-product.command';
export { UpdateProductCommand } from './impl/update-product.command';
export { UpdateProductStockCommand } from './impl/update-product-stock.command';

export const CommandHandlers = [AdjustProductStockHandler, CreateProductHandler, DeleteProductHandler, UpdateProductHandler, UpdateProductStockHandler];

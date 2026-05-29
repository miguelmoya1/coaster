import { AdjustProductStockHandler } from './adjust-product-stock/adjust-product-stock.handler';
import { CreateProductHandler } from './create-product/create-product.handler';
import { DeleteProductHandler } from './delete-product/delete-product.handler';
import { UpdateProductStockHandler } from './update-product-stock/update-product-stock.handler';
import { UpdateProductHandler } from './update-product/update-product.handler';

export { AdjustProductStockCommand } from './adjust-product-stock/adjust-product-stock.command';
export { CreateProductCommand } from './create-product/create-product.command';
export { DeleteProductCommand } from './delete-product/delete-product.command';
export { UpdateProductStockCommand } from './update-product-stock/update-product-stock.command';
export { UpdateProductCommand } from './update-product/update-product.command';

export const CommandHandlers = [
  CreateProductHandler,
  UpdateProductStockHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  AdjustProductStockHandler,
];

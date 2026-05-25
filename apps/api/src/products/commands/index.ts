import { CreateProductHandler } from './create-product/create-product.handler';
import { UpdateProductStockHandler } from './update-product-stock/update-product-stock.handler';
import { UpdateProductHandler } from './update-product/update-product.handler';
import { DeleteProductHandler } from './delete-product/delete-product.handler';

export { CreateProductCommand } from './create-product/create-product.command';
export { UpdateProductStockCommand } from './update-product-stock/update-product-stock.command';
export { UpdateProductCommand } from './update-product/update-product.command';
export { DeleteProductCommand } from './delete-product/delete-product.command';

export const CommandHandlers = [
  CreateProductHandler,
  UpdateProductStockHandler,
  UpdateProductHandler,
  DeleteProductHandler,
];

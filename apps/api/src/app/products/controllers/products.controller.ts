import { BarId, BarRole, ProductId } from '@coaster/interfaces';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStockDto } from '../dto/update-product-stock.dto';
import { ProductsService } from '../services/products.service';

@Controller('bars/:barId/products')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly _productsService: ProductsService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  getProducts(@Param('barId') barId: BarId) {
    return this._productsService.getProductsByBarId(barId);
  }

  @Post()
  @Roles(BarRole.OWNER)
  createProduct(@Param('barId') barId: BarId, @Body() dto: CreateProductDto) {
    return this._productsService.createProduct(barId, dto);
  }

  @Patch(':productId/stock')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  updateStock(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductStockDto,
  ) {
    return this._productsService.updateProductStock(barId, productId, dto);
  }
}

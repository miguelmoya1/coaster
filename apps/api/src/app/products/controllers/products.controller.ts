import { BarId, BarRole, ProductId } from '@coaster/interfaces';
import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';
import { ProductsService } from '../services/products.service';

@Controller('bars/:barId/products')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly _productsService: ProductsService) {}

  @Post()
  @Roles(BarRole.OWNER)
  createProduct(@Param('barId') barId: BarId, @Body() dto: CreateProductDto) {
    return this._productsService.createProduct(barId, dto);
  }

  @Patch(':productId/status')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  updateStatus(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this._productsService.updateProductStatus(barId, productId, dto);
  }
}

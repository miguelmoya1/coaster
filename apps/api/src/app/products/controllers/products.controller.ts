import { BarId, BarRole, ProductId } from '@coaster/interfaces';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStockDto } from '../dto/update-product-stock.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsMapper } from '../mappers/products.mapper';
import { ProductsService } from '../services/products.service';

@Controller('bars/:barId/products')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly _productsService: ProductsService) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getProducts(@Param('barId') barId: BarId) {
    const products = await this._productsService.getProductsByBarId(barId);
    return products.map((p) => ProductsMapper.toDto(p));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createProduct(@Param('barId') barId: BarId, @Body() dto: CreateProductDto) {
    const product = await this._productsService.createProduct(barId, dto);
    return ProductsMapper.toDto(product);
  }

  @Patch(':productId/stock')
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async updateStock(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductStockDto,
  ) {
    const product = await this._productsService.updateProductStock(barId, productId, dto);
    return ProductsMapper.toDto(product);
  }

  @Patch(':productId')
  @Roles(BarRole.OWNER)
  async updateProduct(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this._productsService.updateProduct(barId, productId, dto);
    return ProductsMapper.toDto(product);
  }
}

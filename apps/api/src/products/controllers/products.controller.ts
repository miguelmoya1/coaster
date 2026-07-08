import type { BarId, Product, ProductId } from '@coaster/common';
import { BarPermission } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FirebaseAuthGuard } from '../../auth';
import { BarPermissions, BarPermissionsGuard, commonMapper } from '../../core';
import {
  CreateProductCommand,
  DeleteProductCommand,
  UpdateProductCommand,
  UpdateProductStockCommand,
} from '../commands';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStockDto } from '../dto/update-product-stock.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsMapper } from '../mappers/products.mapper';
import { GetProductsByBarIdQuery } from '../queries';

@Controller('bars/:barId/products')
@UseGuards(FirebaseAuthGuard, BarPermissionsGuard)
export class ProductsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @BarPermissions(BarPermission.BAR_VIEW_PRODUCTS)
  async getProducts(@Param('barId') barId: BarId) {
    const products = await this._queryBus.execute<GetProductsByBarIdQuery, Product[]>(
      new GetProductsByBarIdQuery(barId),
    );
    return products.map((p) => ProductsMapper.toDto(p));
  }

  @Post()
  @BarPermissions(BarPermission.BAR_CREATE_PRODUCT)
  async createProduct(@Param('barId') barId: BarId, @Body() dto: CreateProductDto): Promise<void> {
    await this._commandBus.execute<CreateProductCommand, void>(new CreateProductCommand(barId, dto));
  }

  @Patch(':productId/stock')
  @BarPermissions(BarPermission.BAR_UPDATE_PRODUCT_STOCK)
  async updateStock(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductStockDto,
  ) {
    await this._commandBus.execute<UpdateProductStockCommand, void>(
      new UpdateProductStockCommand(barId, productId, dto),
    );
    return commonMapper.getSuccessResponse();
  }

  @Patch(':productId')
  @BarPermissions(BarPermission.BAR_UPDATE_PRODUCT)
  async updateProduct(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductDto,
  ) {
    await this._commandBus.execute<UpdateProductCommand, void>(new UpdateProductCommand(barId, productId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':productId')
  @BarPermissions(BarPermission.BAR_DELETE_PRODUCT)
  async deleteProduct(@Param('barId') barId: BarId, @Param('productId') productId: ProductId) {
    await this._commandBus.execute<DeleteProductCommand, void>(new DeleteProductCommand(barId, productId));
    return commonMapper.getSuccessResponse();
  }
}

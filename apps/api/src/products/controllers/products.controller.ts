import { type BarId, BarRole, type ProductId, type Product } from '@coaster/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { commonMapper, FirebaseAuthGuard, Roles, RolesGuard } from '../../core';
import {
  CreateProductCommand,
  UpdateProductStockCommand,
  UpdateProductCommand,
  DeleteProductCommand,
} from '../commands';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStockDto } from '../dto/update-product-stock.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsMapper } from '../mappers/products.mapper';
import { GetProductsByBarIdQuery } from '../queries';

@Controller('bars/:barId/products')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @Roles(BarRole.OWNER, BarRole.STAFF)
  async getProducts(@Param('barId') barId: BarId) {
    const products = await this._queryBus.execute<GetProductsByBarIdQuery, Product[]>(
      new GetProductsByBarIdQuery(barId),
    );
    return products.map((p) => ProductsMapper.toDto(p));
  }

  @Post()
  @Roles(BarRole.OWNER)
  async createProduct(@Param('barId') barId: BarId, @Body() dto: CreateProductDto) {
    const result = await this._commandBus.execute<CreateProductCommand, { id: ProductId }>(
      new CreateProductCommand(barId, dto),
    );
    return { id: result.id };
  }

  @Patch(':productId/stock')
  @Roles(BarRole.OWNER, BarRole.STAFF)
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
  @Roles(BarRole.OWNER)
  async updateProduct(
    @Param('barId') barId: BarId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductDto,
  ) {
    await this._commandBus.execute<UpdateProductCommand, void>(new UpdateProductCommand(barId, productId, dto));
    return commonMapper.getSuccessResponse();
  }

  @Delete(':productId')
  @Roles(BarRole.OWNER)
  async deleteProduct(@Param('barId') barId: BarId, @Param('productId') productId: ProductId) {
    await this._commandBus.execute<DeleteProductCommand, void>(new DeleteProductCommand(barId, productId));
    return commonMapper.getSuccessResponse();
  }
}

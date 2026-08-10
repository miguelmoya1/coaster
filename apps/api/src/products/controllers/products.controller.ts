import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId, Product, ProductId } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { EstablishmentPermissions, EstablishmentPermissionsGuard, commonMapper } from '@coaster/core';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { GetProductsByEstablishmentIdQuery } from '../queries';

@Controller('establishments/:establishmentId/products')
@UseGuards(FirebaseAuthGuard, EstablishmentPermissionsGuard)
export class ProductsController {
  constructor(
    private readonly _queryBus: QueryBus,
    private readonly _commandBus: CommandBus,
  ) {}

  @Get()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)
  async getProducts(@Param('establishmentId') establishmentId: EstablishmentId) {
    const products = await this._queryBus.execute<GetProductsByEstablishmentIdQuery, Product[]>(
      new GetProductsByEstablishmentIdQuery(establishmentId),
    );
    return products.map((p) => ProductsMapper.toDto(p));
  }

  @Post()
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_CREATE_PRODUCT)
  async createProduct(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Body() dto: CreateProductDto,
  ): Promise<void> {
    await this._commandBus.execute<CreateProductCommand, void>(new CreateProductCommand(establishmentId, dto));
  }

  @Patch(':productId/stock')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT_STOCK)
  async updateStock(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductStockDto,
  ) {
    await this._commandBus.execute<UpdateProductStockCommand, void>(
      new UpdateProductStockCommand(establishmentId, productId, dto),
    );
    return commonMapper.getSuccessResponse();
  }

  @Patch(':productId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT)
  async updateProduct(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('productId') productId: ProductId,
    @Body() dto: UpdateProductDto,
  ) {
    await this._commandBus.execute<UpdateProductCommand, void>(
      new UpdateProductCommand(establishmentId, productId, dto),
    );
    return commonMapper.getSuccessResponse();
  }

  @Delete(':productId')
  @EstablishmentPermissions(EstablishmentPermission.ESTABLISHMENT_DELETE_PRODUCT)
  async deleteProduct(
    @Param('establishmentId') establishmentId: EstablishmentId,
    @Param('productId') productId: ProductId,
  ) {
    await this._commandBus.execute<DeleteProductCommand, void>(new DeleteProductCommand(establishmentId, productId));
    return commonMapper.getSuccessResponse();
  }
}

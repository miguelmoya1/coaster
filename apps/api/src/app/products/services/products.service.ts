import {
  asCategoryId,
  asProductId,
  asProductStatus,
  BarId,
  CreateProductDto,
  Product,
  ProductId,
  SocketEvents,
  UpdateProductStatusDto,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { BarGateway, Product as ProductDb } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async createProduct(barId: BarId, productDto: CreateProductDto) {
    const validCategoryId = asCategoryId(productDto.categoryId);
    const isValidCategory =
      await this._productsRepository.checkCategoryBelongsToBar(
        validCategoryId,
        barId,
      );

    if (!isValidCategory) {
      throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const product = await this._productsRepository.create(
      validCategoryId,
      productDto,
    );

    const mapped = this.#mapToDomain(product);

    this._barGateway.server
      .to(barId)
      .emit(SocketEvents.PRODUCT_CREATED, mapped);

    return mapped;
  }

  async updateProductStatus(
    barId: BarId,
    productId: ProductId,
    productDto: UpdateProductStatusDto,
  ) {
    const product = await this._productsRepository.updateStatus(
      productId,
      productDto,
    );

    const mapped = this.#mapToDomain(product);

    this._barGateway.server
      .to(barId)
      .emit(SocketEvents.PRODUCT_STATUS_CHANGED, mapped);

    return mapped;
  }

  #mapToDomain(dbProduct: ProductDb): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      status: asProductStatus(dbProduct.status),
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  }
}

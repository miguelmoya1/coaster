import {
  asCategoryId,
  asProductId,
  asProductStatus,
  BarId,
  CreateProductDto,
  Product,
  ProductId,
  UpdateProductStatusDto,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Product as ProductDb } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly _productsRepository: ProductsRepository) {}

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
      productDto.name,
      productDto.status,
    );

    return this.#mapToDomain(product);
  }

  async updateProductStatus(
    productId: ProductId,
    productDto: UpdateProductStatusDto,
  ) {
    const product = await this._productsRepository.updateStatus(
      productId,
      productDto.status,
    );

    return this.#mapToDomain(product);
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

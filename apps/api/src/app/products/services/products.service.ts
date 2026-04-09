import {
  asCategoryId,
  asProductId,
  BarId,
  CreateProductDto,
  Product,
  ProductId,
  SocketEvents,
  UpdateProductStockDto,
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

    const createData = {
      name: productDto.name,
      currentStock: productDto.currentStock,
      minStockAlert: productDto.minStockAlert,
    };

    const product = await this._productsRepository.create(
      validCategoryId,
      createData,
    );

    const mapped = this.#mapToDomain(product);

    this._barGateway.server
      .to(barId)
      .emit(SocketEvents.PRODUCT_CREATED, mapped);

    return mapped;
  }

  async updateProductStock(
    barId: BarId,
    productId: ProductId,
    productDto: UpdateProductStockDto,
  ) {
    const product = await this._productsRepository.updateStock(
      productId,
      productDto,
    );

    const mapped = this.#mapToDomain(product);

    this._barGateway.server
      .to(barId)
      .emit(SocketEvents.PRODUCT_STOCK_CHANGED, mapped);

    return mapped;
  }

  async getProductsByBarId(barId: BarId) {
    const products = await this._productsRepository.findByBarId(barId);

    return products.map((p) => this.#mapToDomain(p));
  }

  #mapToDomain(dbProduct: ProductDb): Product {
    return {
      id: asProductId(dbProduct.id),
      categoryId: asCategoryId(dbProduct.categoryId),
      name: dbProduct.name,
      currentStock: dbProduct.currentStock,
      minStockAlert: dbProduct.minStockAlert,
      lastUpdated: dbProduct.updatedAt.toISOString(),
    };
  }
}

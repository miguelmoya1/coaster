import {
  asCategoryId,
  BarId,
  CreateProductDto,
  ProductId,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/interfaces';
import { ErrorCodes, SocketEvents } from '@coaster/logic';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { BarGateway } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';
import { ProductsMapper } from '../mappers/products.mapper';

@Injectable()
export class ProductsService {
  constructor(
    private readonly _productsRepository: ProductsRepository,
    private readonly _barGateway: BarGateway,
  ) {}

  async createProduct(barId: BarId, productDto: CreateProductDto) {
    const validCategoryId = asCategoryId(productDto.categoryId);
    const isValidCategory = await this._productsRepository.checkCategoryBelongsToBar(validCategoryId, barId);

    if (!isValidCategory) {
      throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
    }

    const createData = {
      name: productDto.name,
      price: productDto.price ?? 0,
      currentStock: productDto.currentStock ?? 0,
      minStockAlert: productDto.minStockAlert ?? 0,
    };

    const product = await this._productsRepository.create(validCategoryId, createData);

    const mapped = ProductsMapper.toDomain(product);

    this._barGateway.server.to(barId).emit(SocketEvents.PRODUCT_CREATED, mapped);

    return mapped;
  }

  async updateProductStock(barId: BarId, productId: ProductId, productDto: UpdateProductStockDto) {
    const product = await this._productsRepository.update(productId, productDto);

    const mapped = ProductsMapper.toDomain(product);

    this._barGateway.server.to(barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, mapped);

    return mapped;
  }

  async updateProduct(barId: BarId, productId: ProductId, productDto: UpdateProductDto) {
    if (productDto.categoryId) {
      const validCategoryId = asCategoryId(productDto.categoryId);
      const isValidCategory = await this._productsRepository.checkCategoryBelongsToBar(validCategoryId, barId);

      if (!isValidCategory) {
        throw new ForbiddenException(ErrorCodes.CATEGORY_NOT_FOUND);
      }
    }

    const product = await this._productsRepository.update(productId, productDto);

    const mapped = ProductsMapper.toDomain(product);

    this._barGateway.server.to(barId).emit(SocketEvents.PRODUCT_STOCK_CHANGED, mapped);

    return mapped;
  }

  async getProductsByBarId(barId: BarId) {
    const products = await this._productsRepository.findByBarId(barId);

    return products.map((p) => ProductsMapper.toDomain(p));
  }

  async deleteProduct(barId: BarId, productId: ProductId) {
    await this._productsRepository.delete(productId);
    this._barGateway.server.to(barId).emit(SocketEvents.PRODUCT_DELETED, { id: productId });
  }
}

import { Product } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { ProductsRepository } from '../../data-access/products.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { GetProductsByBarIdQuery } from './get-products-by-bar-id.query';

@QueryHandler(GetProductsByBarIdQuery)
export class GetProductsByBarIdHandler implements IQueryHandler<GetProductsByBarIdQuery, Product[]> {
  constructor(private readonly _productsRepository: ProductsRepository) {}

  async execute(query: GetProductsByBarIdQuery): Promise<Product[]> {
    const products = await this._productsRepository.findByBarId(query.barId);
    return products.map((p) => ProductsMapper.toDomain(p));
  }
}

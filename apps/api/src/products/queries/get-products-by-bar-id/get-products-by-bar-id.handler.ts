import type { Product } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { GetProductsByBarIdQuery } from './get-products-by-bar-id.query';

@QueryHandler(GetProductsByBarIdQuery)
export class GetProductsByBarIdHandler implements IQueryHandler<GetProductsByBarIdQuery, Product[]> {
  constructor(private readonly readRepo: ProductsReadRepository) {}

  async execute(query: GetProductsByBarIdQuery): Promise<Product[]> {
    const products = await this.readRepo.findByBarId(query.barId);
    return products.map((p) => ProductsMapper.toDomain(p));
  }
}

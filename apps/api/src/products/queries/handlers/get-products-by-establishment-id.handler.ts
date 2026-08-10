import type { Product } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ProductsReadRepository } from '../../data-access/products.read.repository';
import { ProductsMapper } from '../../mappers/products.mapper';
import { GetProductsByEstablishmentIdQuery } from '../impl/get-products-by-establishment-id.query';

@QueryHandler(GetProductsByEstablishmentIdQuery)
export class GetProductsByEstablishmentIdHandler implements IQueryHandler<
  GetProductsByEstablishmentIdQuery,
  Product[]
> {
  constructor(private readonly readRepo: ProductsReadRepository) {}

  async execute(query: GetProductsByEstablishmentIdQuery): Promise<Product[]> {
    const products = await this.readRepo.findByEstablishmentId(query.establishmentId);
    return products.map((p) => ProductsMapper.toDomain(p));
  }
}

import type { User } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserReadRepository } from '../../data-access/user.read.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { GetUserByIdQuery } from './get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, User | null> {
  constructor(private readonly readRepo: UserReadRepository) {}

  async execute(query: GetUserByIdQuery) {
    const user = await this.readRepo.findById(query.id);

    if (!user) {
      return null;
    }

    return UsersMapper.toDomain(user);
  }
}

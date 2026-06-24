import type { User } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserReadRepository } from '../../data-access/user.read.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { GetUserByEmailQuery } from '../impl/get-user-by-email.query';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery, User | null> {
  constructor(private readonly readRepo: UserReadRepository) {}

  async execute(query: GetUserByEmailQuery) {
    const user = await this.readRepo.findByEmail(query.email);

    if (!user) {
      return null;
    }

    return UsersMapper.toDomain(user);
  }
}

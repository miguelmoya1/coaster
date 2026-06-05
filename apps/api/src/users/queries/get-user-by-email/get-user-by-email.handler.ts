import type { User } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { GetUserByEmailQuery } from './get-user-by-email.query';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery, User | null> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserByEmailQuery) {
    const user = await this.userRepository.findByEmail(query.email);

    if (!user) {
      return null;
    }

    return UsersMapper.toDomain(user);
  }
}

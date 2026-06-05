import type { User } from '@coaster/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { GetUserByIdQuery } from './get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, User | null> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserByIdQuery) {
    const user = await this.userRepository.findById(query.id);

    if (!user) {
      return null;
    }

    return UsersMapper.toDomain(user);
  }
}

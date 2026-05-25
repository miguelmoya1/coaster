import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserRepository } from '../../data-access/user.repository';
import { UsersMapper } from '../../mappers/users.mapper';
import { User } from '@coaster/common';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, User | null> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetUserByIdQuery): Promise<User | null> {
    const user = await this.userRepository.getById(query.id);
    if (!user) return null;
    return UsersMapper.toDomain(user);
  }
}

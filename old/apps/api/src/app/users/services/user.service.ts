import { UpdateUserDto, UserId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../data-access/user.repository';
import { UsersMapper } from '../mappers/users.mapper';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async getById(id: UserId) {
    const user = await this.userRepository.getById(id);

    if (!user) {
      return null;
    }

    return UsersMapper.toDomain(user);
  }

  public async update(id: UserId, data: UpdateUserDto) {
    const user = await this.userRepository.update(id, {
      name: data.name,
      photoUrl: data.photoUrl,
    });

    return UsersMapper.toDomain(user);
  }
}

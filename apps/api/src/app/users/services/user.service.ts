import { asUserId, UpdateUserDto, User, UserId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { User as UserDb } from '../../core';
import { UserRepository } from '../data-access/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async getById(id: UserId) {
    const user = await this.userRepository.getById(id);

    if (!user) {
      return null;
    }

    return this.#mapToDomain(user);
  }

  public async update(id: UserId, data: UpdateUserDto) {
    const user = await this.userRepository.update(id, {
      name: data.name,
      photoUrl: data.photoUrl,
    });

    return this.#mapToDomain(user);
  }

  #mapToDomain(dbUser: UserDb): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      googleId: dbUser.googleId ?? undefined,
      photoUrl: dbUser.photoUrl ?? undefined,
      active: dbUser.active,
    };
  }
}

import { asUserId, asUserRole, User, UserId } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CryptoService, UserCreateInput, User as UserDb } from '../../core';
import { UserRepository } from '../data-access/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  public async getById(id: UserId) {
    const user = await this.userRepository.getById(id);

    if (!user) {
      return null;
    }

    return this.#mapToDomain(user);
  }

  public async getByEmail(email: string) {
    const user = await this.userRepository.getByEmail(email);

    if (!user) {
      return null;
    }

    return this.#mapToDomain(user);
  }

  public async create(dto: UserCreateInput) {
    const existsUser = await this.userRepository.getByEmail(dto.email);

    if (existsUser) {
      throw new ConflictException(ErrorCodes.USER_ALREADY_EXISTS);
    }

    const pin = await this.cryptoService.hash(dto.pin);

    const userCreated = await this.userRepository.create({ ...dto, pin });

    if (!userCreated) {
      throw new InternalServerErrorException(ErrorCodes.USER_CREATION_FAILED);
    }

    return this.#mapToDomain(userCreated);
  }

  #mapToDomain(dbUser: UserDb): User {
    return {
      id: asUserId(dbUser.id),
      email: dbUser.email,
      name: dbUser.name,
      role: asUserRole(dbUser.role),
      active: dbUser.active,
    };
  }
}

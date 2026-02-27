import { Injectable } from '@nestjs/common';
import { PrismaService, UserCreateInput, User } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  public async create(dto: UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data: dto });
  }
}

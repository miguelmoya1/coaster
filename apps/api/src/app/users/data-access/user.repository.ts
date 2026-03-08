import { Injectable } from '@nestjs/common';
import { PrismaService, User, UserCreateInput } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async getById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  public async getByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  public async create(dto: UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data: dto });
  }
}

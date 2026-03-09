import { Injectable } from '@nestjs/common';
import { PrismaService, User } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async getById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

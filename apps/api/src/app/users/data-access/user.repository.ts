import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async getById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  public async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}

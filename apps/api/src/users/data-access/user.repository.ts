import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async getById(id: string) {
    return this.prisma.dbUser.findUnique({ where: { id } });
  }

  public async update(id: string, updateUserDto: Prisma.DbUserUpdateInput) {
    return this.prisma.dbUser.update({
      where: { id },
      data: { ...updateUserDto },
    });
  }

  public async upsert(email: string, data: Prisma.DbUserCreateInput) {
    return this.prisma.dbUser.upsert({
      where: { email },
      update: {
        googleId: data.googleId,
        name: data.name,
        photoUrl: data.photoUrl,
        active: data.active,
      },
      create: data,
    });
  }
}

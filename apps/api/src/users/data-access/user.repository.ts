import { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbUserCreateInput, DbUserUpdateInput, PrismaService } from '../../core';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: UserId) {
    return this.prisma.dbUser.findUnique({ where: { id } });
  }

  public async findByEmail(email: string) {
    return this.prisma.dbUser.findUnique({ where: { email } });
  }

  public async update(id: UserId, updateUserDto: DbUserUpdateInput) {
    return this.prisma.dbUser.update({
      where: { id },
      data: { ...updateUserDto },
    });
  }

  public async upsert(email: string, data: DbUserCreateInput) {
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

import { UserId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { BarRole, PrismaService } from '../../core';

@Injectable()
export class BarRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(name: string, userId: UserId) {
    return this._prisma.bar.create({
      data: { name, members: { create: { userId, role: BarRole.OWNER } } },
    });
  }

  async findByUserId(userId: UserId) {
    const barMembers = await this._prisma.barMember.findMany({
      where: { userId },
      include: { bar: true },
    });

    return barMembers.map((barMember) => barMember.bar);
  }
}

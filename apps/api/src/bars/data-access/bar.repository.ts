import { BarId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';

import { BarRole, Prisma, PrismaService } from '../../core';

@Injectable()
export class BarRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(userId: UserId, createBarDto: Prisma.BarCreateInput) {
    return this._prisma.bar.create({
      data: {
        ...createBarDto,
        members: { create: { userId, role: BarRole.OWNER } },
      },
    });
  }

  async findByUserId(userId: UserId) {
    const barMembers = await this._prisma.barMember.findMany({
      where: { userId },
      include: { bar: true },
    });

    return barMembers.map((barMember) => barMember.bar);
  }

  async findById(barId: BarId) {
    return this._prisma.bar.findUnique({ where: { id: barId } });
  }
}

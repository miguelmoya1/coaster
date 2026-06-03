import type { BarId, BarRole, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class BarRepository {
  constructor(private readonly _prisma: PrismaService) {}

  async create(userId: UserId, createBarDto: Prisma.DbBarCreateInput) {
    return this._prisma.dbBar.create({
      data: {
        ...createBarDto,
        members: { create: { userId, role: 'OWNER' as BarRole } },
      },
    });
  }

  async findByUserId(userId: UserId) {
    const barMembers = await this._prisma.dbBarMember.findMany({
      where: { userId },
      include: { bar: true },
    });

    return barMembers.map((barMember) => barMember.bar);
  }

  async findById(barId: BarId) {
    return this._prisma.dbBar.findUnique({ where: { id: barId } });
  }
}

import { Injectable } from '@nestjs/common';
import { Bar, BarMember, PrismaService } from '../../core';

@Injectable()
export class BarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBar(name: string): Promise<Bar> {
    return this.prisma.bar.create({
      data: { name },
    });
  }

  async addMember(
    barId: string,
    userId: string,
    role: import('@coaster/interfaces').BarRole,
  ): Promise<BarMember> {
    return this.prisma.barMember.create({
      data: {
        barId,
        userId,
        role,
      },
    });
  }

  async getBarsForUser(userId: string) {
    return this.prisma.barMember.findMany({
      where: { userId },
      include: { bar: true },
    });
  }
}

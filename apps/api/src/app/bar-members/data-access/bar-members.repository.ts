import { BarId } from '@coaster/interfaces';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class BarMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBarById(barId: BarId) {
    return this.prisma.bar.findUnique({ where: { id: barId } });
  }

  async inviteMember(
    barId: BarId,
    email: string,
    createBarMemberDto: Omit<Prisma.BarMemberCreateInput, 'bar' | 'user'>,
  ) {
    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'NEW_EMPLOYEE',
      },
    });

    return this.prisma.barMember.create({
      data: {
        ...createBarMemberDto,
        bar: { connect: { id: barId } },
        user: { connect: { id: user.id } },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getMembersByBar(barId: string) {
    return this.prisma.barMember.findMany({
      where: { barId, active: true },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}

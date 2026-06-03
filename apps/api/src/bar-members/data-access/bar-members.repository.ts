import type { BarId, BarMemberId, UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '../../core';

@Injectable()
export class BarMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBarById(barId: BarId) {
    return this.prisma.dbBar.findUnique({ where: { id: barId } });
  }

  async inviteMember(
    barId: BarId,
    email: string,
    createBarMemberDto: Omit<Prisma.DbBarMemberCreateInput, 'bar' | 'user'>,
  ) {
    const nameFromEmail = email.split('@')[0];

    const user = await this.prisma.dbUser.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: nameFromEmail,
      },
    });

    return this.prisma.dbBarMember.create({
      data: {
        ...createBarMemberDto,
        bar: { connect: { id: barId } },
        user: { connect: { id: user.id } },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async getMembersByBar(barId: BarId) {
    return this.prisma.dbBarMember.findMany({
      where: { barId, active: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async getMemberByUserAndBar(userId: UserId, barId: BarId) {
    return this.prisma.dbBarMember.findUnique({
      where: {
        userId_barId: {
          userId,
          barId,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, photoUrl: true },
        },
      },
    });
  }

  async removeMember(memberId: BarMemberId) {
    return this.prisma.dbBarMember.delete({
      where: { id: memberId },
    });
  }
}

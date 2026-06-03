import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { asBarId, DbBarRole, PrismaService } from '../../core';
import { BarMembersRepository } from './bar-members.repository';

describe('BarMembersRepository', () => {
  let repository: BarMembersRepository;
  let prisma: {
    dbBar: { findUnique: Mock };
    dbUser: { upsert: Mock };
    dbBarMember: { create: Mock; findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbBar: { findUnique: vi.fn() },
      dbUser: { upsert: vi.fn() },
      dbBarMember: { create: vi.fn(), findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarMembersRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarMembersRepository>(BarMembersRepository);
    prisma = module.get(PrismaService);
  });

  describe('findBarById', () => {
    it('should delegate to prisma.dbBar.findUnique', async () => {
      prisma.dbBar.findUnique.mockResolvedValue({ id: 'bar-1' });

      const result = await repository.findBarById(asBarId('bar-1'));

      expect(prisma.dbBar.findUnique).toHaveBeenCalledWith({ where: { id: 'bar-1' } });
      expect(result).toEqual({ id: 'bar-1' });
    });
  });

  describe('inviteMember', () => {
    it('should upsert the user and create the barMember', async () => {
      prisma.dbUser.upsert.mockResolvedValue({ id: 'new-user' });
      prisma.dbBarMember.create.mockResolvedValue({ id: 'member-1' });

      const result = await repository.inviteMember(asBarId('bar-1'), 'new@test.com', { role: DbBarRole.STAFF });

      expect(prisma.dbUser.upsert).toHaveBeenCalledWith({
        where: { email: 'new@test.com' },
        update: {},
        create: { email: 'new@test.com', name: 'new' },
      });
      expect(prisma.dbBarMember.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'new-user' } }, bar: { connect: { id: 'bar-1' } }, role: DbBarRole.STAFF },
        include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
      });
      expect(result).toEqual({ id: 'member-1' });
    });
  });

  describe('getMembersByBar', () => {
    it('should find active members', async () => {
      prisma.dbBarMember.findMany.mockResolvedValue([{ id: 'm1' }]);

      const result = await repository.getMembersByBar(asBarId('bar-1'));

      expect(prisma.dbBarMember.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1', active: true },
        include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
      });
      expect(result).toEqual([{ id: 'm1' }]);
    });
  });
});

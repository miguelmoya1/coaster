import { asBarId, BarRole } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { BarMembersRepository } from './bar-members.repository';

describe('BarMembersRepository', () => {
  let repository: BarMembersRepository;
  let prisma: {
    bar: { findUnique: jest.Mock };
    user: { upsert: jest.Mock };
    barMember: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      bar: { findUnique: jest.fn() },
      user: { upsert: jest.fn() },
      barMember: { create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarMembersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<BarMembersRepository>(BarMembersRepository);
    prisma = module.get(PrismaService);
  });

  describe('findBarById', () => {
    it('debería delegar a prisma.bar.findUnique', async () => {
      prisma.bar.findUnique.mockResolvedValue({ id: 'bar-1' });

      const result = await repository.findBarById(asBarId('bar-1'));

      expect(prisma.bar.findUnique).toHaveBeenCalledWith({ where: { id: 'bar-1' } });
      expect(result).toEqual({ id: 'bar-1' });
    });
  });

  describe('inviteMember', () => {
    it('debería hacer upsert del usuario y crear el barMember', async () => {
      prisma.user.upsert.mockResolvedValue({ id: 'new-user' });
      prisma.barMember.create.mockResolvedValue({ id: 'member-1' });

      const result = await repository.inviteMember(
        asBarId('bar-1'),
        'new@test.com',
        { role: BarRole.STAFF },
      );

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { email: 'new@test.com' },
        update: {},
        create: { email: 'new@test.com', name: 'NEW_EMPLOYEE' },
      });
      expect(prisma.barMember.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'new-user' } }, bar: { connect: { id: 'bar-1' } }, role: BarRole.STAFF },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toEqual({ id: 'member-1' });
    });
  });

  describe('getMembersByBar', () => {
    it('debería buscar miembros activos', async () => {
      prisma.barMember.findMany.mockResolvedValue([{ id: 'm1' }]);

      const result = await repository.getMembersByBar('bar-1');

      expect(prisma.barMember.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1', active: true },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toEqual([{ id: 'm1' }]);
    });
  });
});

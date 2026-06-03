import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { asBarId } from '../../core';
import { DbBarRole, DbService } from '../../db';;
import { BarMembersRepository } from './bar-members.repository';

describe('BarMembersRepository', () => {
  let repository: BarMembersRepository;
  let db: {
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
      providers: [BarMembersRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarMembersRepository>(BarMembersRepository);
    db = module.get(DbService);
  });

  describe('findBarById', () => {
    it('should delegate to db.dbBar.findUnique', async () => {
      db.dbBar.findUnique.mockResolvedValue({ id: 'bar-1' });

      const result = await repository.findBarById(asBarId('bar-1'));

      expect(db.dbBar.findUnique).toHaveBeenCalledWith({ where: { id: 'bar-1' } });
      expect(result).toEqual({ id: 'bar-1' });
    });
  });

  describe('inviteMember', () => {
    it('should upsert the user and create the barMember', async () => {
      db.dbUser.upsert.mockResolvedValue({ id: 'new-user' });
      db.dbBarMember.create.mockResolvedValue({ id: 'member-1' });

      const result = await repository.inviteMember(asBarId('bar-1'), 'new@test.com', { role: DbBarRole.STAFF });

      expect(db.dbUser.upsert).toHaveBeenCalledWith({
        where: { email: 'new@test.com' },
        update: {},
        create: { email: 'new@test.com', name: 'new' },
      });
      expect(db.dbBarMember.create).toHaveBeenCalledWith({
        data: { user: { connect: { id: 'new-user' } }, bar: { connect: { id: 'bar-1' } }, role: DbBarRole.STAFF },
        include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
      });
      expect(result).toEqual({ id: 'member-1' });
    });
  });

  describe('getMembersByBar', () => {
    it('should find active members', async () => {
      db.dbBarMember.findMany.mockResolvedValue([{ id: 'm1' }]);

      const result = await repository.getMembersByBar(asBarId('bar-1'));

      expect(db.dbBarMember.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1', active: true },
        include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
      });
      expect(result).toEqual([{ id: 'm1' }]);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarMembersWriteRepository } from './bar-members.write.repository';
import { DbService, DbBarRole } from '../../db';
import { asBarId, asUserId, asBarMemberId } from '../../core';

describe('BarMembersWriteRepository', () => {
  let repository: BarMembersWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarMembersWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbBarMember: {
              create: vi.fn(),
              deleteMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<BarMembersWriteRepository>(BarMembersWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('invite', () => {
    it('should call dbBarMember.create with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const userId = asUserId('user-1');
      const createBarMemberDto = { role: DbBarRole.WAITER, active: false };
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbBarMember.create).mockResolvedValue(expectedResult as any);

      const result = await repository.invite(barId, userId, createBarMemberDto as any);

      expect(dbService.dbBarMember.create).toHaveBeenCalledWith({
        data: {
          ...createBarMemberDto,
          barId,
          userId,
        },
        include: {
          user: { select: { email: true, name: true } },
          bar: { select: { name: true } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbBarMember.deleteMany and return true if deleted', async () => {
      const barId = asBarId('bar-1');
      const barMemberId = asBarMemberId('member-1');
      vi.mocked(dbService.dbBarMember.deleteMany).mockResolvedValue({ count: 1 } as any);

      const result = await repository.delete(barId, barMemberId);

      expect(dbService.dbBarMember.deleteMany).toHaveBeenCalledWith({
        where: { id: barMemberId, barId },
      });
      expect(result).toBe(true);
    });

    it('should call dbBarMember.deleteMany and return false if not deleted', async () => {
      const barId = asBarId('bar-1');
      const barMemberId = asBarMemberId('member-1');
      vi.mocked(dbService.dbBarMember.deleteMany).mockResolvedValue({ count: 0 } as any);

      const result = await repository.delete(barId, barMemberId);

      expect(dbService.dbBarMember.deleteMany).toHaveBeenCalledWith({
        where: { id: barMemberId, barId },
      });
      expect(result).toBe(false);
    });
  });
});

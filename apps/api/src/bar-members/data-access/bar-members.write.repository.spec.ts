import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asBarMemberId, asUserId } from '../../core';
import { DbBarRole, DbService } from '../../core/db';
import { BarMembersWriteRepository } from './bar-members.write.repository';

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
              upsert: vi.fn(),
              updateMany: vi.fn(),
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
    it('should call dbBarMember.upsert with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const userId = asUserId('user-1');
      const createBarMemberDto = { role: DbBarRole.WAITER, active: false };
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbBarMember.upsert).mockResolvedValue(expectedResult as any);

      const result = await repository.invite(barId, userId, createBarMemberDto as any);

      expect(dbService.dbBarMember.upsert).toHaveBeenCalledWith({
        where: {
          userId_barId: {
            userId,
            barId,
          },
        },
        create: {
          ...createBarMemberDto,
          barId,
          userId,
        },
        update: {
          ...createBarMemberDto,
          deletedAt: null,
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
    it('should call dbBarMember.updateMany and return true if deleted', async () => {
      const barId = asBarId('bar-1');
      const barMemberId = asBarMemberId('member-1');
      vi.mocked(dbService.dbBarMember.updateMany).mockResolvedValue({ count: 1 } as any);

      const result = await repository.delete(barId, barMemberId);

      expect(dbService.dbBarMember.updateMany).toHaveBeenCalledWith({
        where: { id: barMemberId, barId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe(true);
    });

    it('should call dbBarMember.updateMany and return false if not deleted', async () => {
      const barId = asBarId('bar-1');
      const barMemberId = asBarMemberId('member-1');
      vi.mocked(dbService.dbBarMember.updateMany).mockResolvedValue({ count: 0 } as any);

      const result = await repository.delete(barId, barMemberId);

      expect(dbService.dbBarMember.updateMany).toHaveBeenCalledWith({
        where: { id: barMemberId, barId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe(false);
    });
  });
});

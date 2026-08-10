import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DbService } from '../../db';
import { SecurityRepository } from './security.repository';

describe('SecurityRepository', () => {
  let repository: SecurityRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityRepository,
        {
          provide: DbService,
          useValue: {
            dbUser: { findUnique: vi.fn() },
            dbBarMember: { findUnique: vi.fn() },
          },
        },
      ],
    }).compile();

    repository = module.get<SecurityRepository>(SecurityRepository);
    dbService = module.get<DbService>(DbService);
  });

  describe('getBarMemberRole', () => {
    it('should ignore memberships that were removed from the bar', async () => {
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue(null as any);

      const membership = await repository.getBarMemberRole('user-1', 'bar-1');

      expect(dbService.dbBarMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_barId: { userId: 'user-1', barId: 'bar-1' },
          deletedAt: null,
        },
        select: { role: true, active: true },
      });
      expect(membership).toBeNull();
    });

    it('should return the role of a live membership', async () => {
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue({ role: 'MANAGER', active: true } as any);

      await expect(repository.getBarMemberRole('user-1', 'bar-1')).resolves.toEqual({
        role: 'MANAGER',
        active: true,
      });
    });
  });
});

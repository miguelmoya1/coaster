import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { passThroughCache } from '../../../../test/utils/passthrough-cache';
import { CacheService } from '../../cache/cache.service';
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
            dbEstablishmentMember: { findUnique: vi.fn() },
          },
        },
        { provide: CacheService, useValue: passThroughCache },
      ],
    }).compile();

    repository = module.get<SecurityRepository>(SecurityRepository);
    dbService = module.get<DbService>(DbService);
  });

  describe('getEstablishmentMemberRole', () => {
    it('should ignore memberships that were removed from the establishment', async () => {
      vi.mocked(dbService.dbEstablishmentMember.findUnique).mockResolvedValue(null as any);

      const membership = await repository.getEstablishmentMemberRole('user-1', 'establishment-1');

      expect(dbService.dbEstablishmentMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_establishmentId: { userId: 'user-1', establishmentId: 'establishment-1' },
          deletedAt: null,
        },
        select: { role: true, active: true },
      });
      expect(membership).toBeNull();
    });

    it('should return the role of a live membership', async () => {
      vi.mocked(dbService.dbEstablishmentMember.findUnique).mockResolvedValue({ role: 'MANAGER', active: true } as any);

      await expect(repository.getEstablishmentMemberRole('user-1', 'establishment-1')).resolves.toEqual({
        role: 'MANAGER',
        active: true,
      });
    });
  });
});

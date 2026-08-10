import { asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { DbEstablishmentRole, DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersWriteRepository } from './establishment-members.write.repository';

describe('EstablishmentMembersWriteRepository', () => {
  let repository: EstablishmentMembersWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentMembersWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbEstablishmentMember: {
              upsert: vi.fn(),
              updateMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<EstablishmentMembersWriteRepository>(EstablishmentMembersWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('invite', () => {
    it('should call dbEstablishmentMember.upsert with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const userId = asUserId('user-1');
      const createEstablishmentMemberDto = { role: DbEstablishmentRole.STAFF, active: false };
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbEstablishmentMember.upsert).mockResolvedValue(expectedResult as any);

      const result = await repository.invite(establishmentId, userId, createEstablishmentMemberDto as any);

      expect(dbService.dbEstablishmentMember.upsert).toHaveBeenCalledWith({
        where: {
          userId_establishmentId: {
            userId,
            establishmentId,
          },
        },
        create: {
          ...createEstablishmentMemberDto,
          establishmentId,
          userId,
        },
        update: {
          ...createEstablishmentMemberDto,
          deletedAt: null,
        },
        include: {
          user: { select: { email: true, name: true } },
          establishment: { select: { name: true } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbEstablishmentMember.updateMany and return true if deleted', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const establishmentMemberId = asEstablishmentMemberId('member-1');
      vi.mocked(dbService.dbEstablishmentMember.updateMany).mockResolvedValue({ count: 1 } as any);

      const result = await repository.delete(establishmentId, establishmentMemberId);

      expect(dbService.dbEstablishmentMember.updateMany).toHaveBeenCalledWith({
        where: { id: establishmentMemberId, establishmentId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe(true);
    });

    it('should call dbEstablishmentMember.updateMany and return false if not deleted', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const establishmentMemberId = asEstablishmentMemberId('member-1');
      vi.mocked(dbService.dbEstablishmentMember.updateMany).mockResolvedValue({ count: 0 } as any);

      const result = await repository.delete(establishmentId, establishmentMemberId);

      expect(dbService.dbEstablishmentMember.updateMany).toHaveBeenCalledWith({
        where: { id: establishmentMemberId, establishmentId },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe(false);
    });
  });
});

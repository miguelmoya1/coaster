import { asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from './establishment-members.read.repository';

describe('EstablishmentMembersReadRepository', () => {
  let repository: EstablishmentMembersReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentMembersReadRepository,
        {
          provide: DbService,
          useValue: {
            dbEstablishmentMember: {
              findFirst: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
            dbEstablishment: {
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<EstablishmentMembersReadRepository>(EstablishmentMembersReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('isMember', () => {
    it('should call dbEstablishmentMember.findFirst with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const email = 'test@test.com';
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbEstablishmentMember.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.isMember(establishmentId, email);

      expect(dbService.dbEstablishmentMember.findFirst).toHaveBeenCalledWith({
        where: { establishmentId, user: { email }, deletedAt: null },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findEstablishmentById', () => {
    it('should call dbEstablishment.findUnique with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = { id: 'establishment-1' };
      vi.mocked(dbService.dbEstablishment.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findEstablishmentById(establishmentId);

      expect(dbService.dbEstablishment.findUnique).toHaveBeenCalledWith({
        where: { id: establishmentId },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMembersByEstablishment', () => {
    it('should call dbEstablishmentMember.findMany with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = [{ id: 'member-1' }];
      vi.mocked(dbService.dbEstablishmentMember.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.getMembersByEstablishment(establishmentId);

      expect(dbService.dbEstablishmentMember.findMany).toHaveBeenCalledWith({
        where: { establishmentId, active: true, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              passwordUpdatedAt: true,
              _count: { select: { identities: true } },
            },
          },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMemberById', () => {
    it('should look the member up with what it takes to tell a pending invite', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const memberId = asEstablishmentMemberId('member-1');
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbEstablishmentMember.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.getMemberById(establishmentId, memberId);

      expect(dbService.dbEstablishmentMember.findFirst).toHaveBeenCalledWith({
        where: { id: memberId, establishmentId, deletedAt: null },
        include: {
          establishment: { select: { name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              active: true,
              passwordUpdatedAt: true,
              _count: { select: { identities: true } },
            },
          },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMemberByUserAndEstablishment', () => {
    it('should call dbEstablishmentMember.findFirst with correct parameters', async () => {
      const userId = asUserId('user-1');
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbEstablishmentMember.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.getMemberByUserAndEstablishment(userId, establishmentId);

      expect(dbService.dbEstablishmentMember.findFirst).toHaveBeenCalledWith({
        where: { userId, establishmentId, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              passwordUpdatedAt: true,
              _count: { select: { identities: true } },
            },
          },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});

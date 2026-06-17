import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarMembersReadRepository } from './bar-members.read.repository';
import { DbService } from '../../db';
import { asBarId, asUserId } from '../../core';

describe('BarMembersReadRepository', () => {
  let repository: BarMembersReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarMembersReadRepository,
        {
          provide: DbService,
          useValue: {
            dbBarMember: {
              findFirst: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
            dbBar: {
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<BarMembersReadRepository>(BarMembersReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('isMember', () => {
    it('should call dbBarMember.findFirst with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const email = 'test@test.com';
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbBarMember.findFirst).mockResolvedValue(expectedResult as any);

      const result = await repository.isMember(barId, email);

      expect(dbService.dbBarMember.findFirst).toHaveBeenCalledWith({
        where: { barId, user: { email } },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findBarById', () => {
    it('should call dbBar.findUnique with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = { id: 'bar-1' };
      vi.mocked(dbService.dbBar.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findBarById(barId);

      expect(dbService.dbBar.findUnique).toHaveBeenCalledWith({
        where: { id: barId },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMembersByBar', () => {
    it('should call dbBarMember.findMany with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = [{ id: 'member-1' }];
      vi.mocked(dbService.dbBarMember.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.getMembersByBar(barId);

      expect(dbService.dbBarMember.findMany).toHaveBeenCalledWith({
        where: { barId, active: true },
        include: {
          user: { select: { id: true, name: true, email: true, photoUrl: true } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getMemberByUserAndBar', () => {
    it('should call dbBarMember.findUnique with correct parameters', async () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      const expectedResult = { id: 'member-1' };
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.getMemberByUserAndBar(userId, barId);

      expect(dbService.dbBarMember.findUnique).toHaveBeenCalledWith({
        where: { userId_barId: { userId, barId } },
        include: {
          user: { select: { id: true, name: true, email: true, photoUrl: true } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});

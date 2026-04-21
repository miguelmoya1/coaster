import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { PrismaService } from '../../core';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: { user: { findUnique: Mock } };

  beforeEach(async () => {
    const mockPrisma = { user: { findUnique: vi.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get(PrismaService);
  });

  it('should call prisma.user.findUnique with the id', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    const result = await repository.getById('u1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result).toEqual({ id: 'u1' });
  });

  it('should return null if it does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.getById('no-exist');

    expect(result).toBeNull();
  });
});

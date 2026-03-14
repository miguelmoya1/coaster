import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    const mockPrisma = { user: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get(PrismaService);
  });

  it('debería llamar a prisma.user.findUnique con el id', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    const result = await repository.getById('u1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(result).toEqual({ id: 'u1' });
  });

  it('debería devolver null si no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.getById('no-exist');

    expect(result).toBeNull();
  });
});

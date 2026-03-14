import { asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '../data-access/user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepo = { getById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  it('debería devolver null si el usuario no existe', async () => {
    repository.getById.mockResolvedValue(null);

    const result = await service.getById(asUserId('no-exist'));

    expect(repository.getById).toHaveBeenCalledWith('no-exist');
    expect(result).toBeNull();
  });

  it('debería mapear correctamente el usuario de DB a dominio', async () => {
    repository.getById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.getById(asUserId('user-1'));

    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      active: true,
    });
  });

  it('debería mapear googleId null a undefined', async () => {
    repository.getById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: null,
      active: true,
    } as any);

    const result = await service.getById(asUserId('user-1'));

    expect(result?.googleId).toBeUndefined();
  });
});

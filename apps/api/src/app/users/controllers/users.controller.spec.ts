import { User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../core';
import { UserService } from '../services/user.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let userService: jest.Mocked<UserService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockUserService = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    })
      .overrideGuard(OptionalFirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    userService = module.get(UserService);
  });

  it('debería devolver el usuario actual', async () => {
    const fakeUser: User = {
      id: 'user-1' as any,
      email: 'test@mail.com',
      name: 'Test',
      active: true,
    };

    const result = await controller.findMe(fakeUser);

    expect(result).toEqual(fakeUser);
  });
});

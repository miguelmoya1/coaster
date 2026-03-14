import { User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OptionalFirebaseAuthGuard } from '../../core';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    })
      .overrideGuard(OptionalFirebaseAuthGuard).useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
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

import { asUserId, User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../core';
import { UserService } from '../services/user.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockUserService = {
      update: vi.fn(),
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
  });

  it('should return the current user', async () => {
    const fakeUser: User = {
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test',
      active: true,
    };

    const result = await controller.findMe(fakeUser);

    expect(result).toEqual(fakeUser);
  });
});

import { asUserId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../core';
import { UsersController } from './users.controller';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateUserCommand } from '../commands';

describe('UsersController', () => {
  let controller: UsersController;
  let commandBus: Mocked<CommandBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OptionalFirebaseAuthGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    commandBus = module.get(CommandBus);
  });

  it('findMe should return the user directly using mappers', () => {
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'u@u.com', active: true };
    const result = controller.findMe(user);
    expect(result.id).toBe(user.id);
  });

  it('updateMe should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'user-1', name: 'New Name' });
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'u@u.com', active: true };
    const dto = { name: 'New Name' };

    const result = await controller.updateMe(user, dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateUserCommand));
    expect(result.name).toBe('New Name');
  });
});

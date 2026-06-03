import { CanActivate } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, OptionalFirebaseAuthGuard } from '../../auth';
import { asUserId } from '../../core';
import { UpdateUserCommand } from '../commands';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let commandBus: Mocked<CommandBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: CommandBus, useValue: mockCommandBus }],
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
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'u@u.com', active: true, role: 'USER' as const };
    const result = controller.findMe(user);
    expect(result?.id).toBe(user.id);
  });

  it('findMe should return null if no user is provided', () => {
    const result = controller.findMe(null);
    expect(result).toBeNull();
  });

  it('updateMe should delegate to command bus', async () => {
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'u@u.com', active: true, role: 'USER' as const };
    const dto = { name: 'New Name' };
    commandBus.execute.mockResolvedValue({
      id: asUserId('user-1'),
      name: 'New Name',
      email: user.email,
      active: user.active,
      role: user.role,
    });

    const result = await controller.updateMe(user, dto);

    expect(commandBus.execute).toHaveBeenCalledWith(new UpdateUserCommand(user.id, dto));
    expect(result?.id).toBe(user.id);
    expect(result?.name).toBe('New Name');
    expect(result?.email).toBe(user.email);
    expect(result?.active).toBe(user.active);
    expect(result?.role).toBe(user.role);
  });
});

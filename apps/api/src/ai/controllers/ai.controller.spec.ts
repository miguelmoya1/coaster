import { FirebaseAuthGuard } from '@coaster/auth';
import type { User } from '@coaster/common';
import { asBarId, asUserId } from '@coaster/common';
import { BarPermissionsGuard } from '@coaster/core';
import { CanActivate } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { ExecuteAiCommand } from '../commands';
import { AiController } from './ai.controller';

describe('AiController', () => {
  let controller: AiController;
  let commandBus: Mocked<CommandBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: CommandBus, useValue: mockCommandBus }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(BarPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AiController>(AiController);
    commandBus = module.get(CommandBus);
  });

  it('executeCommand should delegate to CommandBus executing ExecuteAiCommand', async () => {
    const barId = asBarId('bar-123');
    const prompt = 'Crea la mesa 5';
    const user = { id: asUserId('user-123'), name: 'Test Waiter' } as User;
    const expectedResponse = { text: 'Mesa creada correctamente.' };

    commandBus.execute.mockResolvedValue(expectedResponse);

    const result = await controller.executeCommand(barId, prompt, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(ExecuteAiCommand));
    expect(result).toEqual(expectedResponse);
  });
});

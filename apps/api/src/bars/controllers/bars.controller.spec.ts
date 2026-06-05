import { asBarId, asUserId } from '../../core';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { PermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import { CreateBarCommand } from '../commands';
import { GetBarByIdQuery, GetBarsForUserQuery } from '../queries';
import { BarsController } from './bars.controller';
import { DbRole } from '../../db';

describe('BarsController', () => {
  let controller: BarsController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarsController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<BarsController>(BarsController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('createBar should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const user = { id: asUserId('user-1'), name: 'User', email: 'u@u.com', active: true, role: 'USER' as DbRole };
    const dto = { name: 'El Bar' };

    await controller.createBar(dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateBarCommand));
  });

  it('getBars should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);
    const user = { id: asUserId('user-1'), name: 'User', email: 'u@u.com', active: true, role: 'USER' as DbRole };

    await controller.getBars(user);

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetBarsForUserQuery));
  });

  it('getBar should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue({ id: 'bar-1' });

    await controller.getBar(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetBarByIdQuery));
  });
});

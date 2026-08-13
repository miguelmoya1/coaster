import { FirebaseAuthGuard } from '@coaster/auth';
import { asEstablishmentId, asUserId } from '@coaster/common';
import { EstablishmentPermissionsGuard } from '@coaster/core';
import { DbRole } from '@coaster/core/db';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { CreateEstablishmentCommand } from '../commands';
import { GetEstablishmentByIdQuery, GetEstablishmentsForUserQuery } from '../queries';
import { EstablishmentsController } from './establishments.controller';

describe('EstablishmentsController', () => {
  let controller: EstablishmentsController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablishmentsController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(EstablishmentPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<EstablishmentsController>(EstablishmentsController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('createEstablishment should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const user = {
      id: asUserId('user-1'),
      name: 'User',
      email: 'u@u.com',
      active: true,
      role: 'USER' as DbRole,
      language: 'es',
    };
    const dto = { name: 'El Establishment' };

    await controller.createEstablishment(dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateEstablishmentCommand));
  });

  it('getEstablishments should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);
    const user = {
      id: asUserId('user-1'),
      name: 'User',
      email: 'u@u.com',
      active: true,
      role: 'USER' as DbRole,
      language: 'es',
    };

    await controller.getEstablishments(user);

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetEstablishmentsForUserQuery));
  });

  it('getEstablishment should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue({ id: 'establishment-1' });

    await controller.getEstablishment(asEstablishmentId('establishment-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetEstablishmentByIdQuery));
  });
});

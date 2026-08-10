import { FirebaseAuthGuard } from '@coaster/auth';
import { asEstablishmentId, asEstablishmentMemberId, asUserId, EstablishmentRole, Role } from '@coaster/common';
import { EstablishmentPermissionsGuard } from '@coaster/core';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { InviteMemberCommand, RemoveMemberCommand } from '../commands';
import { GetMembersQuery } from '../queries';
import { EstablishmentMembersController } from './establishment-members.controller';

describe('EstablishmentMembersController', () => {
  let controller: EstablishmentMembersController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstablishmentMembersController],
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

    controller = module.get<EstablishmentMembersController>(EstablishmentMembersController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getMembers should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getMembers(asEstablishmentId('establishment-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetMembersQuery));
  });

  it('getMyMember should delegate to query bus with user id', async () => {
    queryBus.execute.mockResolvedValue({
      id: asEstablishmentMemberId('mem-1'),
      userId: asUserId('user-1'),
      establishmentId: asEstablishmentId('establishment-1'),
      role: EstablishmentRole.STAFF,
      permissions: [],
      active: true,
      userName: 'John Doe',
      userImage: '',
      userEmail: 'john@test.com',
    });

    const user = {
      id: asUserId('user-1'),
      name: 'John Doe',
      email: 'john@test.com',
      active: true,
      role: Role.USER,
      language: 'en',
    };
    const result = await controller.getMyMember(asEstablishmentId('establishment-1'), user);

    expect(result.id).toBe(asEstablishmentMemberId('mem-1'));
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        establishmentId: asEstablishmentId('establishment-1'),
        user: expect.objectContaining({ id: 'user-1' }),
      }),
    );
  });

  it('inviteMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({});
    const user = {
      id: asUserId('admin-id'),
      name: 'Admin',
      email: 'a@a.com',
      active: true,
      role: Role.ADMIN,
      language: 'en',
    };
    const dto = { email: 'new@staff.com', role: EstablishmentRole.STAFF };

    await controller.inviteMember(asEstablishmentId('establishment-1'), dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(InviteMemberCommand));
  });

  it('removeMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.removeMember(asEstablishmentId('establishment-1'), asEstablishmentMemberId('mem-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RemoveMemberCommand));
  });
});

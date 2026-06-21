import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { asBarId, asBarMemberId, asUserId, BarPermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import { PrepareInviteMemberCommand, RemoveMemberCommand } from '../commands';
import { GetMembersQuery } from '../queries';
import { BarMembersController } from './bar-members.controller';

describe('BarMembersController', () => {
  let controller: BarMembersController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarMembersController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(BarPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<BarMembersController>(BarMembersController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getMembers should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getMembers(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetMembersQuery));
  });

  it('getMyMember should delegate to query bus with user id', async () => {
    queryBus.execute.mockResolvedValue({
      id: asBarMemberId('mem-1'),
      userId: asUserId('user-1'),
      barId: asBarId('bar-1'),
      role: 'STAFF' as const,
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
      role: 'USER' as const,
    };
    const result = await controller.getMyMember(asBarId('bar-1'), user);

    expect(result.id).toBe(asBarMemberId('mem-1'));
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        barId: asBarId('bar-1'),
        user: expect.objectContaining({ id: 'user-1' }),
      }),
    );
  });

  it('inviteMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({});
    const user = { id: asUserId('admin-id'), name: 'Admin', email: 'a@a.com', active: true, role: 'ADMIN' as const };
    const dto = { email: 'new@staff.com', role: 'STAFF' as const };

    await controller.inviteMember(asBarId('bar-1'), dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(PrepareInviteMemberCommand));
  });

  it('removeMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.removeMember(asBarId('bar-1'), asBarMemberId('mem-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RemoveMemberCommand));
  });
});

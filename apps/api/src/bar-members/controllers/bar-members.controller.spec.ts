import { asBarId, asUserId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { BarMembersController } from './bar-members.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InviteMemberCommand, RemoveMemberCommand } from '../commands';
import { GetMembersQuery } from '../queries';

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
      .overrideGuard(RolesGuard)
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

  it('inviteMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({});
    const user = { id: asUserId('admin-id'), name: 'Admin', email: 'a@a.com', active: true };
    const dto = { email: 'new@staff.com', role: 'staff' as any };

    await controller.inviteMember(asBarId('bar-1'), dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(InviteMemberCommand));
  });

  it('removeMember should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.removeMember(asBarId('bar-1'), 'mem-1' as any);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RemoveMemberCommand));
  });
});

import { asBarId, asBarMemberId, asUserId, BarRole, User } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { BarMembersService } from '../services/bar-members.service';
import { BarMembersController } from './bar-members.controller';

describe('BarMembersController', () => {
  let controller: BarMembersController;
  let service: Mocked<BarMembersService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  const fakeUser: User = {
    id: asUserId('admin-1'),
    email: 'admin@test.com',
    name: 'Admin',
    active: true,
  };

  beforeEach(async () => {
    const mockService = {
      getMembers: vi.fn(),
      invite: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarMembersController],
      providers: [{ provide: BarMembersService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<BarMembersController>(BarMembersController);
    service = module.get(BarMembersService);
  });

  it('getMembers should delegate to the service', async () => {
    service.getMembers.mockResolvedValue([]);

    await controller.getMembers(asBarId('bar-1'));

    expect(service.getMembers).toHaveBeenCalledWith('bar-1');
  });

  it('inviteMember should delegate to the service', async () => {
    const dto = { email: 'new@mail.com', role: BarRole.STAFF };
    service.invite.mockResolvedValue({
      id: asBarMemberId('member-1'),
      barId: asBarId('bar-1'),
      userId: asUserId('user-1'),
      role: BarRole.STAFF,
      active: true,
      userName: 'User',
      userEmail: 'new@mail.com',
      userImage: 'image',
    });

    await controller.inviteMember(asBarId('bar-1'), dto, fakeUser);

    expect(service.invite).toHaveBeenCalledWith('bar-1', 'new@mail.com', BarRole.STAFF, fakeUser);
  });
});

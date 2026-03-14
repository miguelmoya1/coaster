import { asBarId, asUserId, BarRole, User } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { BarMembersService } from '../services/bar-members.service';
import { BarMembersController } from './bar-members.controller';

describe('BarMembersController', () => {
  let controller: BarMembersController;
  let service: jest.Mocked<BarMembersService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  const fakeUser: User = {
    id: asUserId('admin-1'),
    email: 'admin@test.com',
    name: 'Admin',
    active: true,
  };

  beforeEach(async () => {
    const mockService = {
      getMembers: jest.fn(),
      invite: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarMembersController],
      providers: [{ provide: BarMembersService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<BarMembersController>(BarMembersController);
    service = module.get(BarMembersService);
  });

  it('getMembers debería delegar al servicio', () => {
    service.getMembers.mockResolvedValue([]);

    controller.getMembers(asBarId('bar-1'));

    expect(service.getMembers).toHaveBeenCalledWith('bar-1');
  });

  it('inviteMember debería delegar al servicio', () => {
    const dto = { email: 'new@mail.com', role: BarRole.STAFF };
    service.invite.mockResolvedValue({} as any);

    controller.inviteMember(asBarId('bar-1'), dto as any, fakeUser);

    expect(service.invite).toHaveBeenCalledWith(
      'bar-1',
      'new@mail.com',
      BarRole.STAFF,
      fakeUser,
    );
  });
});

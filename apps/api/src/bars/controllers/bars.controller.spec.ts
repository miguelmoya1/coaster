import { asUserId, User } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, PrismaService, RolesGuard } from '../../core';
import { BarsService } from '../services/bars.service';
import { BarsController } from './bars.controller';

describe('BarsController', () => {
  let controller: BarsController;
  let service: Mocked<BarsService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  const fakeUser: User = {
    id: asUserId('user-1'),
    email: 'test@mail.com',
    name: 'Test',
    active: true,
  };

  beforeEach(async () => {
    const mockService = {
      create: vi.fn(),
      getForUser: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarsController],
      providers: [
        { provide: BarsService, useValue: mockService },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<BarsController>(BarsController);
    service = module.get(BarsService);
  });

  it('createBar should delegate to the service', async () => {
    service.create.mockResolvedValue({ id: 'bar-1', name: 'Mi Bar' });

    const result = await controller.createBar(fakeUser, { name: 'Mi Bar' });

    expect(service.create).toHaveBeenCalledWith({ name: 'Mi Bar' }, fakeUser);
    expect(result).toEqual({ id: 'bar-1', name: 'Mi Bar' });
  });

  it('getMyBars should delegate to the service', async () => {
    service.getForUser.mockResolvedValue([]);

    const result = await controller.getMyBars(fakeUser);

    expect(service.getForUser).toHaveBeenCalledWith(fakeUser);
    expect(result).toEqual([]);
  });
});

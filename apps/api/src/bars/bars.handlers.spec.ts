import { asBarId, asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarRepository } from './data-access/bar.repository';
import { GetBarByIdHandler } from './queries/get-bar-by-id/get-bar-by-id.handler';
import { GetBarByIdQuery } from './queries';
import { GetBarsForUserHandler } from './queries/get-bars-for-user/get-bars-for-user.handler';
import { GetBarsForUserQuery } from './queries';
import { CreateBarHandler } from './commands/create-bar/create-bar.handler';
import { CreateBarCommand } from './commands';

describe('Bars CQRS Handlers', () => {
  let getBarByIdHandler: GetBarByIdHandler;
  let getBarsForUserHandler: GetBarsForUserHandler;
  let createBarHandler: CreateBarHandler;

  let repository = {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBarByIdHandler,
        GetBarsForUserHandler,
        CreateBarHandler,
        { provide: BarRepository, useValue: repository },
      ],
    }).compile();

    getBarByIdHandler = module.get<GetBarByIdHandler>(GetBarByIdHandler);
    getBarsForUserHandler = module.get<GetBarsForUserHandler>(GetBarsForUserHandler);
    createBarHandler = module.get<CreateBarHandler>(CreateBarHandler);
    repository = module.get(BarRepository);
  });

  describe('GetBarByIdHandler', () => {
    it('should return bar by ID', async () => {
      const barId = asBarId('bar-1');
      repository.findById.mockResolvedValue({
        id: 'bar-1',
        name: 'El Bar',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getBarByIdHandler.execute(new GetBarByIdQuery(barId));

      expect(repository.findById).toHaveBeenCalledWith(barId);
      expect(result?.id).toBe(barId);
      expect(result?.name).toBe('El Bar');
    });

    it('should return null if bar is not found', async () => {
      const barId = asBarId('non-existent');
      repository.findById.mockResolvedValue(null);

      const result = await getBarByIdHandler.execute(new GetBarByIdQuery(barId));
      expect(result).toBeNull();
    });
  });

  describe('GetBarsForUserQuery', () => {
    it('should return bars for user', async () => {
      const user = { id: asUserId('user-1'), name: 'User 1', email: 'a@a.com', active: true };
      repository.findByUserId.mockResolvedValue([]);

      const result = await getBarsForUserHandler.execute(new GetBarsForUserQuery(user));

      expect(repository.findByUserId).toHaveBeenCalledWith(user.id);
      expect(result).toEqual([]);
    });
  });

  describe('CreateBarCommand', () => {
    it('should create a bar', async () => {
      const user = { id: asUserId('user-1'), name: 'User 1', email: 'a@a.com', active: true };
      const dto = { name: 'New Bar' };
      repository.create.mockResolvedValue({
        id: 'bar-new',
        name: 'New Bar',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createBarHandler.execute(new CreateBarCommand(dto, user));

      expect(repository.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toEqual({ id: asBarId('bar-new') });
    });
  });
});

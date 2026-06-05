import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId } from '../../../core';
import { DbRole } from '../../../db';
import { BarRepository } from '../../data-access/bar.repository';
import { CreateBarCommand } from './create-bar.command';
import { CreateBarHandler } from './create-bar.handler';

describe('CreateBarHandler', () => {
  let handler: CreateBarHandler;
  const repository = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateBarHandler, { provide: BarRepository, useValue: repository }],
    }).compile();

    handler = module.get<CreateBarHandler>(CreateBarHandler);
  });

  it('should create a bar', async () => {
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'a@a.com', active: true, role: DbRole.USER };
    const dto = { name: 'New Bar' };
    repository.create.mockResolvedValue({
      id: 'bar-new',
      name: 'New Bar',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new CreateBarCommand(dto, user));

    expect(repository.create).toHaveBeenCalledWith(user.id, dto);
    expect(result).toBeUndefined();
  });
});
